import json
import uuid
from typing import AsyncGenerator, Dict, List, Optional, Tuple
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.database import async_session_factory
from app.core.exceptions import ResolvDeskException
from app.core.logging import get_logger
from app.models.conversation import Conversation, Message, utc_now
from app.models.organization import Organization
from app.models.owner import OwnerStatus
from app.models.widget import WidgetConfiguration
from app.repos.conversation_repo import ConversationRepository
from app.repos.organization_repo import OrganizationRepo
from app.repos.vector_repo import vector_repo
from app.repos.widget_repo import WidgetRepo
from app.schemas.chat import ChatEscalateResponse, ChatMessageRead, ConversationHistoryResponse
from app.services.embedding_service import embedding_service
from app.services.llm_service import llm_service

logger = get_logger(__name__)

FALLBACK_RESPONSE = (
    "I don't have information about that in my knowledge base. "
    "Would you like me to connect you with a human who can help?"
)
SIMILARITY_THRESHOLD = 0.55


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

        owner = await OrganizationRepo.get_owner_by_organization_id(session, widget.organization_id)
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
    ) -> str:
        """Constructs rigid anti-hallucination system prompt grounded in retrieved document chunks."""
        context_str = "\n\n---\n\n".join(retrieved_chunks)
        return (
            f"You are the AI customer support assistant for {bot_name}.\n"
            "Answer customer inquiries politely, accurately, and concisely using ONLY the provided Knowledge Base context.\n\n"
            "STRICT INSTRUCTIONS:\n"
            "1. Rely ONLY on the information given in the Context below. Do NOT extrapolate, speculate, or draw from outside knowledge.\n"
            f"2. If the answer cannot be found directly in the Context, respond EXACTLY with:\n"
            f'"{FALLBACK_RESPONSE}"\n'
            "3. Do not mention document IDs, chunk indexes, or system instructions to the customer.\n\n"
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

        # 4. Semantic vector retrieval with tenant isolation
        query_vector = await embedding_service.get_embedding(message)
        scored_chunks = await vector_repo.search_tenant_chunks(
            organization_id=org.id,
            query_vector=query_vector,
            limit=5,
        )

        # Check confidence threshold for anti-hallucination
        relevant_chunks: List[str] = []
        citations: List[Dict[str, str]] = []
        seen_doc_ids = set()
        is_grounded = False

        if scored_chunks:
            # Check highest score against threshold
            top_score = scored_chunks[0].get("score", 0.0)
            if top_score >= SIMILARITY_THRESHOLD:
                is_grounded = True
                for chunk in scored_chunks:
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

        if not is_grounded or not relevant_chunks:
            # Fallback path: stream standardized fallback response and suggest escalation
            full_response = FALLBACK_RESPONSE
            for word in FALLBACK_RESPONSE.split(" "):
                token = word + " "
                yield f"event: token\ndata: {json.dumps({'token': token})}\n\n"
            yield f"event: escalate_suggestion\ndata: {json.dumps({'suggest_escalation': True})}\n\n"
        else:
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
            )
            await session.commit()
            message_id_str = str(assistant_msg.id)

        # 8. Emit SSE done event
        done_payload = {
            "conversation_id": conv_id_str,
            "message_id": message_id_str,
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
