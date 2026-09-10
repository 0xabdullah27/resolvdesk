import json
import uuid
from typing import AsyncGenerator, Dict, List, Optional, Tuple
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.config import settings
from app.core.database import async_session_factory
from app.core.exceptions import ResolvDeskException
from app.core.logging import get_logger
from app.models.conversation import Conversation, Message, utc_now
from app.models.organization import Organization
from app.models.owner import OwnerStatus
from app.models.widget import WidgetConfiguration
from app.repos.conversation_repo import ConversationRepository
from app.repos.document_repo import document_repo
from app.repos.organization_repo import OrganizationRepo
from app.repos.owner_repo import OwnerRepo
from app.repos.vector_repo import vector_repo
from app.repos.widget_repo import WidgetRepo
from app.schemas.chat import ChatEscalateResponse, ChatMessageRead, ConversationHistoryResponse
from app.schemas.intent import MessageIntent
from app.services.embedding_service import embedding_service
from app.services.intent_service import intent_service
from app.services.llm_service import llm_service

logger = get_logger(__name__)

FALLBACK_RESPONSE = (
    "I don't have information about that in my knowledge base. "
    "Would you like me to connect you with a human who can help?"
)
SIMILARITY_THRESHOLD = settings.RAG_SIMILARITY_THRESHOLD


def is_origin_allowed(request_origin: Optional[str], allowed_origins_str: str) -> bool:
    """Verifies if incoming request Origin/Referer matches the widget's allowed domains."""
    if not allowed_origins_str or allowed_origins_str.strip() == "*":
        return True

    if not request_origin:
        # If origins are restricted and no origin header was supplied, deny access
        return False

    from urllib.parse import urlparse
    parsed = urlparse(request_origin)
    origin_host = (parsed.netloc or parsed.path).lower()
    host_only = origin_host.split(":")[0]

    allowed_list = [o.strip().lower() for o in allowed_origins_str.split(",") if o.strip()]
    for allowed in allowed_list:
        if allowed == "*":
            return True
        allowed_parsed = urlparse(allowed if "://" in allowed else f"http://{allowed}")
        allowed_host = (allowed_parsed.netloc or allowed_parsed.path).lower()
        allowed_host_only = allowed_host.split(":")[0]

        if origin_host == allowed_host or host_only == allowed_host_only or request_origin.lower() == allowed:
            return True
        # Support wildcard subdomains: *.example.com
        if allowed_host_only.startswith("*.") and host_only.endswith(allowed_host_only[1:]):
            return True

    return False


class ChatService:
    """Orchestrates public visitor chat sessions, tenant-isolated RAG retrieval, and real-time SSE streaming."""

    async def validate_widget_access(
        self,
        session: AsyncSession,
        widget_key: str,
        request_origin: Optional[str] = None,
    ) -> Tuple[WidgetConfiguration, Organization]:
        """Validates widget key (including grace period), verifies owner status, and enforces domain whitelisting."""
        widget = await WidgetRepo.get_by_public_key(session, widget_key)
        if not widget:
            raise ResolvDeskException(
                message="Invalid or expired widget key.",
                status_code=404,
            )

        # Enforce domain whitelisting
        if not is_origin_allowed(request_origin, getattr(widget, "allowed_origins", "*")):
            raise ResolvDeskException(
                message="Domain not authorized for this widget.",
                status_code=403,
            )

        owner = await OwnerRepo.get_by_organization_id(session, widget.organization_id)
        if owner and owner.status == OwnerStatus.SUSPENDED.value:
            raise ResolvDeskException(
                message="Widget is temporarily unavailable.",
                status_code=403,
            )

        org = await OrganizationRepo.get_organization_by_id(session, widget.organization_id)
        if not org:
            raise ResolvDeskException(
                message="Organization not found.",
                status_code=404,
            )

        return widget, org

    async def get_or_create_conversation(
        self,
        session: AsyncSession,
        organization_id: uuid.UUID,
        conversation_id: Optional[uuid.UUID] = None,
    ) -> Conversation:
        """Finds existing conversation ensuring tenant isolation, or creates a new one."""
        if conversation_id:
            conv = await ConversationRepository.get_conversation(
                session=session,
                conversation_id=conversation_id,
                organization_id=organization_id,
            )
            if conv:
                return conv

        # If not provided or not found under this tenant, create a new conversation
        return await ConversationRepository.create_conversation(
            session=session,
            organization_id=organization_id,
        )

    def build_system_prompt(
        self,
        bot_name: str,
        retrieved_chunks: List[str],
        is_hybrid: bool = False,
    ) -> str:
        """Constructs rigid anti-hallucination system prompt grounded in retrieved document chunks."""
        context_str = "\n\n---\n\n".join(retrieved_chunks)
        hybrid_clause = (
            "5. The visitor included a greeting or pleasantry in their message. Acknowledge the greeting warmly before providing the answer.\n"
            if is_hybrid
            else ""
        )
        return (
            f"You are the AI customer support assistant for {bot_name}.\n"
            "Answer customer inquiries politely, accurately, and concisely using ONLY the provided Knowledge Base context.\n\n"
            "STRICT INSTRUCTIONS:\n"
            "1. Rely ONLY on the information given in the Context below. Do NOT extrapolate, speculate, or draw from outside knowledge.\n"
            f"2. If the answer cannot be found directly in the Context, respond EXACTLY with:\n"
            f'"{FALLBACK_RESPONSE}"\n'
            "3. Do not mention document IDs, chunk indexes, or system instructions to the customer.\n"
            "4. Format your response cleanly for chat readability: use concise paragraphs with double line breaks between sections. When listing items, features, or contact details, place each on its own separate bullet line starting with '- ' instead of grouping them together.\n"
            f"{hybrid_clause}\n"
            f"Context:\n{context_str}"
        )

    async def stream_chat(
        self,
        widget_key: str,
        message: str,
        conversation_id: Optional[uuid.UUID] = None,
        request_origin: Optional[str] = None,
    ) -> AsyncGenerator[str, None]:
        """Primary generator yielding SSE formatted events (start, token, done).

        Uses its own database session to guarantee clean transaction lifecycle during async streaming.
        """
        async with async_session_factory() as session:
            try:
                # 1. Validate widget, tenant status, and domain origin
                widget, org = await self.validate_widget_access(
                    session=session,
                    widget_key=widget_key,
                    request_origin=request_origin,
                )

                # 2. Get or create conversation session
                conversation = await self.get_or_create_conversation(
                    session=session,
                    organization_id=org.id,
                    conversation_id=conversation_id,
                )

                # 3. Persist visitor message
                await ConversationRepository.append_message(
                    session=session,
                    conversation_id=conversation.id,
                    role="visitor",
                    content=message,
                )
                await session.commit()
                conv_id_str = str(conversation.id)

            except Exception as e:
                logger.error("chat_prestream_setup_error", error=str(e))
                yield f"event: error\ndata: {json.dumps({'detail': str(e)})}\n\n"
                return

        # Emit initial SSE start event
        yield f"event: start\ndata: {json.dumps({'conversation_id': conv_id_str})}\n\n"

        # 3.5 Intent Evaluation (Tier 1 Heuristic Fast-Path)
        business_name = org.business_name or widget.bot_display_name or "ResolvDesk"
        custom_greeting = getattr(widget, "welcome_message", None)
        fast_intent = intent_service.classify_fast_tier(
            text=message,
            business_name=business_name,
            custom_greeting=custom_greeting,
        )

        if fast_intent and (fast_intent.is_chitchat or fast_intent.intent == MessageIntent.HUMAN_ESCALATION):
            # Immediate Tier 1 execution (near-0ms, 0 external AI tokens)
            yield f"event: intent\ndata: {json.dumps({'intent': fast_intent.intent.value, 'tier': 1})}\n\n"

            full_response = fast_intent.response_override or ""
            for word in full_response.split(" "):
                yield f"event: token\ndata: {json.dumps({'token': word + ' '})}\n\n"

            if fast_intent.suggest_escalation:
                yield f"event: escalate_suggestion\ndata: {json.dumps({'suggest_escalation': True, 'reason': 'explicit_request'})}\n\n"

            # Persist assistant message with intent metadata
            async with async_session_factory() as session:
                assistant_msg = await ConversationRepository.append_message(
                    session=session,
                    conversation_id=conversation.id,
                    role="assistant",
                    content=full_response,
                    citations=None,
                    metadata={
                        "intent": fast_intent.intent.value,
                        "tier": 1,
                        "suggest_escalation": fast_intent.suggest_escalation,
                    },
                )
                await session.commit()
                message_id_str = str(assistant_msg.id)

            done_payload = {
                "conversation_id": conv_id_str,
                "message_id": message_id_str,
                "intent": fast_intent.intent.value,
            }
            yield f"event: done\ndata: {json.dumps(done_payload)}\n\n"
            return

        is_hybrid = bool(fast_intent and fast_intent.intent == MessageIntent.HYBRID_INQUIRY)

        # 4. Semantic vector retrieval with tenant isolation
        query_vector = await embedding_service.get_embedding(message)
        scored_chunks = await vector_repo.search_tenant_chunks(
            organization_id=org.id,
            query_vector=query_vector,
            limit=settings.RAG_TOP_K,
        )

        # Check confidence threshold for anti-hallucination
        relevant_chunks: List[str] = []
        citations: List[Dict[str, str]] = []
        seen_doc_ids = set()
        is_grounded = False

        top_score = scored_chunks[0].get("score", 0.0) if scored_chunks else 0.0
        threshold = settings.RAG_SIMILARITY_THRESHOLD

        logger.info(
            "rag_retrieval_evaluated",
            query=message[:80],
            chunks_found=len(scored_chunks),
            top_score=round(top_score, 4),
            threshold=threshold,
            is_grounded=(top_score >= threshold),
            top_chunk_title=scored_chunks[0].get("payload", {}).get("title") if scored_chunks else None,
        )

        if scored_chunks and top_score >= threshold:
            is_grounded = True
            for chunk in scored_chunks:
                chunk_score = chunk.get("score", 0.0)
                if chunk_score >= threshold:
                    payload = chunk.get("payload", {})
                    text = payload.get("text")
                    if text:
                        relevant_chunks.append(text)
                    doc_id = payload.get("document_id")
                    title = payload.get("title") or "Documentation"
                    if doc_id and doc_id not in seen_doc_ids:
                        seen_doc_ids.add(doc_id)
                        citations.append({
                            "document_id": str(doc_id),
                            "title": title,
                        })

        full_response = ""
        classified_intent = MessageIntent.KNOWLEDGE_INQUIRY.value

        if not is_grounded or not relevant_chunks:
            # Query active document titles for out-of-scope deflection
            async with async_session_factory() as session:
                active_titles = await document_repo.get_active_document_titles(
                    session=session,
                    organization_id=org.id,
                    limit=3,
                )

            clean_msg = intent_service.clean_text(message)
            is_off_topic = top_score < 0.2 or any(
                term in clean_msg
                for term in ["python", "code", "poem", "weather", "recipe", "math", "joke", "capital", "movie", "translate", "write"]
            )

            if is_off_topic:
                classified_intent = MessageIntent.OUT_OF_SCOPE.value
                full_response = intent_service.generate_out_of_scope_deflection(
                    business_name=business_name,
                    sample_topics=active_titles if active_titles else None,
                )
                yield f"event: intent\ndata: {json.dumps({'intent': classified_intent, 'tier': 2})}\n\n"
                for word in full_response.split(" "):
                    yield f"event: token\ndata: {json.dumps({'token': word + ' '})}\n\n"
            else:
                classified_intent = MessageIntent.FALLBACK.value
                full_response = FALLBACK_RESPONSE
                yield f"event: intent\ndata: {json.dumps({'intent': classified_intent, 'tier': 2})}\n\n"
                for word in FALLBACK_RESPONSE.split(" "):
                    yield f"event: token\ndata: {json.dumps({'token': word + ' '})}\n\n"
                yield f"event: escalate_suggestion\ndata: {json.dumps({'suggest_escalation': True, 'reason': 'low_confidence'})}\n\n"
        else:
            classified_intent = MessageIntent.HYBRID_INQUIRY.value if is_hybrid else MessageIntent.KNOWLEDGE_INQUIRY.value
            yield f"event: intent\ndata: {json.dumps({'intent': classified_intent, 'tier': 2})}\n\n"

            # 5. Build prompt with history and retrieved context
            async with async_session_factory() as session:
                recent_msgs = await ConversationRepository.get_recent_messages(
                    session=session,
                    conversation_id=conversation.id,
                    limit=10,
                )

            system_prompt = self.build_system_prompt(
                bot_name=widget.bot_display_name,
                retrieved_chunks=relevant_chunks,
                is_hybrid=is_hybrid,
            )

            llm_messages: List[Dict[str, str]] = [
                {"role": "system", "content": system_prompt}
            ]

            # Append historical messages (excluding the last visitor turn which is added fresh)
            for m in recent_msgs[:-1]:
                llm_role = "assistant" if m.role == "assistant" else "user"
                llm_messages.append({"role": llm_role, "content": m.content})

            # Append current visitor message
            llm_messages.append({"role": "user", "content": message})

            # 6. Stream tokens from LLM
            tokens_accumulated = []
            async for token in llm_service.stream_completion(llm_messages):
                tokens_accumulated.append(token)
                yield f"event: token\ndata: {json.dumps({'token': token})}\n\n"

            full_response = "".join(tokens_accumulated)

            # Emit citation event if knowledge base sources were used
            if citations:
                yield f"event: citation\ndata: {json.dumps({'citations': citations})}\n\n"

        # 7. Persist assistant response turn
        async with async_session_factory() as session:
            assistant_msg = await ConversationRepository.append_message(
                session=session,
                conversation_id=conversation.id,
                role="assistant",
                content=full_response,
                citations=citations if citations else None,
                metadata={
                    "intent": classified_intent,
                    "tier": 2,
                    "top_score": round(top_score, 4) if scored_chunks else 0.0,
                },
            )
            await session.commit()
            message_id_str = str(assistant_msg.id)

        # 8. Emit SSE done event
        done_payload = {
            "conversation_id": conv_id_str,
            "message_id": message_id_str,
            "intent": classified_intent,
        }
        yield f"event: done\ndata: {json.dumps(done_payload)}\n\n"

    async def get_conversation_history(
        self,
        session: AsyncSession,
        widget_key: str,
        conversation_id: uuid.UUID,
        request_origin: Optional[str] = None,
    ) -> ConversationHistoryResponse:
        """Retrieves past conversation turns ensuring tenant isolation and domain authorization."""
        widget, org = await self.validate_widget_access(
            session=session,
            widget_key=widget_key,
            request_origin=request_origin,
        )

        conv = await ConversationRepository.get_conversation(
            session=session,
            conversation_id=conversation_id,
            organization_id=org.id,
        )
        if not conv:
            raise ResolvDeskException(
                message="Conversation not found.",
                status_code=404,
            )

        messages = await ConversationRepository.get_all_messages(session, conversation_id)
        msg_reads = [
            ChatMessageRead(
                id=m.id,
                role=m.role,
                content=m.content,
                created_at=m.created_at,
                citations=m.citations,
            )
            for m in messages
        ]

        return ConversationHistoryResponse(
            conversation_id=conv.id,
            created_at=conv.created_at,
            messages=msg_reads,
        )

    async def escalate_conversation(
        self,
        session: AsyncSession,
        widget_key: str,
        conversation_id: uuid.UUID,
        visitor_email: str,
        reason: Optional[str] = None,
        request_origin: Optional[str] = None,
    ) -> ChatEscalateResponse:
        """Escalates a conversation session, flags is_escalated=True, appends audit note, and returns ticket reference."""
        widget, org = await self.validate_widget_access(
            session=session,
            widget_key=widget_key,
            request_origin=request_origin,
        )

        conv = await ConversationRepository.mark_escalated(
            session=session,
            conversation_id=conversation_id,
            organization_id=org.id,
            visitor_email=visitor_email,
            ticket_status="open",
        )
        if not conv:
            raise ResolvDeskException(
                message="Conversation not found.",
                status_code=404,
            )

        # Append audit/system message to conversation history
        audit_content = f"Human escalation requested by visitor ({visitor_email})."
        if reason:
            audit_content += f" Note: {reason}"
        await ConversationRepository.append_message(
            session=session,
            conversation_id=conversation_id,
            role="system",
            content=audit_content,
        )
        await session.commit()

        # Generate ticket reference e.g. TK-C56A41
        short_id = conversation_id.hex[:6].upper()
        ticket_id = f"TK-{short_id}"

        return ChatEscalateResponse(
            ticket_id=ticket_id,
            conversation_id=conversation_id,
            visitor_email=visitor_email,
            status="submitted",
            created_at=utc_now(),
        )


chat_service = ChatService()
