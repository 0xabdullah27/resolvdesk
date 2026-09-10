import json
import re
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
EMAIL_REGEX = r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+"


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

    def build_fallback_prompt(
        self,
        business_name: str,
        topics: Optional[List[str]] = None,
    ) -> str:
        """Constructs smart fallback prompt for out-of-knowledge queries, conversational memory, and de-escalation."""
        topics_context = (
            f"Our primary areas of focus and documented services include: {', '.join(topics[:4])}."
            if topics
            else ""
        )
        return (
            f"You are the virtual customer support specialist for {business_name}. {topics_context}\n"
            "You do not have a direct verified answer for the visitor's latest inquiry, but you must guide them professionally.\n\n"
            "STRICT INSTRUCTIONS:\n"
            "1. Conversational Memory: If the visitor asks what you just said, to repeat, or to clarify, summarize your previous response accurately and conversationally from the chat history.\n"
            "2. Natural Tone: Speak naturally, warmly, and empathetically. NEVER use technical or robotic terms like 'knowledge base', 'context', or 'database'.\n"
            "3. High-Intent & Sales: If the visitor asks for quotes, demos, pricing, or purchasing that isn't documented, warmly invite them to share their email or contact info so our team can follow up directly.\n"
            "4. Frustration & De-escalation: If the visitor is annoyed, angry, or requests a human, apologize with empathy and ask for their email so our human support team can step in.\n"
            "5. Polite Boundaries: If the question is about unrelated general topics (trivia, coding, math, general world facts), politely state:\n"
            f'"{FALLBACK_RESPONSE}"\n'
            "6. Anti-Hallucination: Never invent pricing, guarantees, or policies. Keep replies concise (2-3 sentences max) and always offer a helpful next step."
        )

    def contextualize_query(self, message: str, recent_msgs: List[Message]) -> str:
        """Enriches brief follow-up queries with previous visitor question context to resolve pronouns in vector search."""
        if not recent_msgs:
            return message

        # Find the most recent visitor question prior to this message
        last_visitor_query = next(
            (m.content for m in reversed(recent_msgs) if m.role == "visitor"),
            None,
        )
        if not last_visitor_query:
            return message

        words = message.lower().split()
        follow_up_cues = {
            "it", "this", "that", "they", "them", "these", "those",
            "cost", "price", "also", "and", "how about", "what about",
            "why", "where", "how long", "can i", "does it", "is it",
        }
        has_cue = any(cue in message.lower() for cue in follow_up_cues)

        if len(words) <= 7 or has_cue:
            enriched = f"{last_visitor_query} {message}"
            logger.info("rag_query_contextualized", raw=message, enriched=enriched)
            return enriched

        return message

    async def stream_chat(
        self,
        widget_key: str,
        message: str,
        conversation_id: Optional[uuid.UUID] = None,
        request_origin: Optional[str] = None,
    ) -> AsyncGenerator[str, None]:
        """Primary generator yielding SSE formatted events (start, token, done).

        Optimized to use exactly two database sessions (one pre-stream, one post-stream)
        to prevent database connection pool exhaustion under high concurrency.
        """
        email_match = re.search(EMAIL_REGEX, message)
        extracted_email = email_match.group(0).lower() if email_match else None

        # ---------------------------------------------------------------------
        # Session 1: Pre-stream setup (Validate, fetch context, persist message)
        # ---------------------------------------------------------------------
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

                # 3. Fetch recent messages before appending new turn (for history & contextualization)
                recent_msgs = await ConversationRepository.get_recent_messages(
                    session=session,
                    conversation_id=conversation.id,
                    limit=10,
                )

                # 4. If visitor provided an email directly in the chat, capture as escalated lead
                if extracted_email:
                    await ConversationRepository.mark_escalated(
                        session=session,
                        conversation_id=conversation.id,
                        organization_id=org.id,
                        visitor_email=extracted_email,
                        ticket_status="open",
                    )

                # 5. Persist visitor message
                await ConversationRepository.append_message(
                    session=session,
                    conversation_id=conversation.id,
                    role="visitor",
                    content=message,
                )

                # 6. Fetch active document titles for out-of-scope deflection if needed
                active_titles = await document_repo.get_active_document_titles(
                    session=session,
                    organization_id=org.id,
                    limit=3,
                )
                await session.commit()

                conv_id_str = str(conversation.id)
                conv_uuid = conversation.id
                org_id = org.id
                bot_name = getattr(widget, "bot_display_name", None) or "ResolvDesk"
                business_name = getattr(org, "display_name", None) or bot_name
                custom_greeting = getattr(widget, "welcome_message", None)

            except Exception as e:
                logger.error("chat_prestream_setup_error", error=str(e))
                yield f"event: error\ndata: {json.dumps({'detail': str(e)})}\n\n"
                return

        # Emit initial SSE start event
        yield f"event: start\ndata: {json.dumps({'conversation_id': conv_id_str})}\n\n"

        # ---------------------------------------------------------------------
        # Inline Lead Capture Fast-Path: If user solely/primarily provided an email
        # ---------------------------------------------------------------------
        if extracted_email and len(message.strip().split()) <= 6:
            ack_response = (
                f"Thank you! I have recorded your email ({extracted_email}). Our team has been notified and "
                "will get back to you shortly. Is there anything else I can help you with today?"
            )
            yield f"event: intent\ndata: {json.dumps({'intent': MessageIntent.HUMAN_ESCALATION.value, 'tier': 1})}\n\n"
            for word in ack_response.split(" "):
                yield f"event: token\ndata: {json.dumps({'token': word + ' '})}\n\n"

            # Post-stream persist
            async with async_session_factory() as session:
                assistant_msg = await ConversationRepository.append_message(
                    session=session,
                    conversation_id=conv_uuid,
                    role="assistant",
                    content=ack_response,
                    citations=None,
                    metadata={"intent": MessageIntent.HUMAN_ESCALATION.value, "tier": 1, "lead_email": extracted_email},
                )
                await session.commit()
                message_id_str = str(assistant_msg.id)

            yield f"event: done\ndata: {json.dumps({'conversation_id': conv_id_str, 'message_id': message_id_str, 'intent': MessageIntent.HUMAN_ESCALATION.value})}\n\n"
            return

        # ---------------------------------------------------------------------
        # Intent Evaluation (Tier 1 Heuristic Fast-Path: Greetings, Gratitude, Farewell)
        # ---------------------------------------------------------------------
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
                    conversation_id=conv_uuid,
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

        # ---------------------------------------------------------------------
        # Tier 2: Query Contextualization + Semantic Vector Retrieval
        # ---------------------------------------------------------------------
        search_query = self.contextualize_query(message, recent_msgs)
        query_vector = await embedding_service.get_embedding(search_query)
        scored_chunks = await vector_repo.search_tenant_chunks(
            organization_id=org_id,
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
            search_query=search_query[:80],
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

        # ---------------------------------------------------------------------
        # Branch 3A / 3B: Generation or Fallback
        # ---------------------------------------------------------------------
        if not is_grounded or not relevant_chunks:
            clean_msg = intent_service.clean_text(message)
            off_topic_patterns = [
                r"\b(code|coding|python|javascript|java|c\+\+|html|css|sql|script)\b",
                r"\b(poem|story|song|essay|joke|riddle)\b",
                r"\b(weather|recipe|cooking|movie|celebrity|news)\b",
                r"\b(math|calculate|calculator|\d+\s*[\+\-\*\/]\s*\d+)\b",
                r"\b(translate|translation|write\s+me)\b",
            ]
            is_off_topic = any(re.search(pat, clean_msg) for pat in off_topic_patterns)

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
                yield f"event: intent\ndata: {json.dumps({'intent': classified_intent, 'tier': 2})}\n\n"

                # Smart Fallback LLM generation
                fallback_prompt = self.build_fallback_prompt(business_name=business_name, topics=active_titles)
                fallback_messages = [
                    {"role": "system", "content": fallback_prompt}
                ]
                for m in recent_msgs[-4:]:
                    fallback_messages.append({
                        "role": "assistant" if m.role == "assistant" else "user",
                        "content": m.content,
                    })
                fallback_messages.append({"role": "user", "content": message})

                tokens_accumulated = []
                try:
                    async for token in llm_service.stream_completion(fallback_messages):
                        tokens_accumulated.append(token)
                        yield f"event: token\ndata: {json.dumps({'token': token})}\n\n"
                    full_response = "".join(tokens_accumulated)
                    if not full_response.strip() or "trouble connecting" in full_response:
                        full_response = FALLBACK_RESPONSE
                        for word in FALLBACK_RESPONSE.split(" "):
                            yield f"event: token\ndata: {json.dumps({'token': word + ' '})}\n\n"
                except Exception:
                    full_response = FALLBACK_RESPONSE
                    for word in FALLBACK_RESPONSE.split(" "):
                        yield f"event: token\ndata: {json.dumps({'token': word + ' '})}\n\n"

                yield f"event: escalate_suggestion\ndata: {json.dumps({'suggest_escalation': True, 'reason': 'low_confidence'})}\n\n"
        else:
            classified_intent = MessageIntent.HYBRID_INQUIRY.value if is_hybrid else MessageIntent.KNOWLEDGE_INQUIRY.value
            yield f"event: intent\ndata: {json.dumps({'intent': classified_intent, 'tier': 2})}\n\n"

            system_prompt = self.build_system_prompt(
                bot_name=bot_name,
                retrieved_chunks=relevant_chunks,
                is_hybrid=is_hybrid,
            )

            llm_messages: List[Dict[str, str]] = [
                {"role": "system", "content": system_prompt}
            ]

            # Append historical messages for conversational memory
            for m in recent_msgs:
                llm_role = "assistant" if m.role == "assistant" else "user"
                llm_messages.append({"role": llm_role, "content": m.content})

            # Append current visitor message
            llm_messages.append({"role": "user", "content": message})

            # Stream tokens from LLM
            tokens_accumulated = []
            async for token in llm_service.stream_completion(llm_messages):
                tokens_accumulated.append(token)
                yield f"event: token\ndata: {json.dumps({'token': token})}\n\n"

            full_response = "".join(tokens_accumulated)

            # Emit citation event if knowledge base sources were used
            if citations:
                yield f"event: citation\ndata: {json.dumps({'citations': citations})}\n\n"

        # ---------------------------------------------------------------------
        # Session 2: Post-stream persist assistant turn & commit
        # ---------------------------------------------------------------------
        async with async_session_factory() as session:
            assistant_msg = await ConversationRepository.append_message(
                session=session,
                conversation_id=conv_uuid,
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

        # Emit SSE done event
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
