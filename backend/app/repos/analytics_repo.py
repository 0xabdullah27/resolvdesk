import datetime
import uuid
from typing import Any, Dict, List, Optional, Tuple
from collections import defaultdict
from sqlalchemy import func
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.models.conversation import Conversation, Message, utc_now


class AnalyticsRepo:
    """Repository handling tenant-isolated database aggregations for the analytics dashboard."""

    @staticmethod
    async def get_overview_metrics(
        session: AsyncSession,
        organization_id: uuid.UUID,
    ) -> Dict[str, Any]:
        """Calculates high-level conversation metrics and ticket status counts strictly scoped to the tenant."""
        # All-time conversations
        total_conv_stmt = select(func.count(Conversation.id)).where(
            Conversation.organization_id == organization_id
        )
        total_conv = (await session.exec(total_conv_stmt)).one() or 0

        # Last 30-day conversations
        thirty_days_ago = utc_now() - datetime.timedelta(days=30)
        conv_30d_stmt = select(func.count(Conversation.id)).where(
            Conversation.organization_id == organization_id,
            Conversation.created_at >= thirty_days_ago,
        )
        conv_30d = (await session.exec(conv_30d_stmt)).one() or 0

        # Total messages across organization conversations
        total_msgs_stmt = (
            select(func.count(Message.id))
            .join(Conversation, Message.conversation_id == Conversation.id)
            .where(Conversation.organization_id == organization_id)
        )
        total_msgs = (await session.exec(total_msgs_stmt)).one() or 0

        # Escalated conversations
        escalated_stmt = select(func.count(Conversation.id)).where(
            Conversation.organization_id == organization_id,
            Conversation.is_escalated == True,
        )
        escalated_conv = (await session.exec(escalated_stmt)).one() or 0

        # Active tickets (open or in_progress)
        open_tickets_stmt = select(func.count(Conversation.id)).where(
            Conversation.organization_id == organization_id,
            Conversation.is_escalated == True,
            Conversation.ticket_status.in_(["open", "in_progress"]),
        )
        open_tickets = (await session.exec(open_tickets_stmt)).one() or 0

        # Resolved tickets
        resolved_tickets_stmt = select(func.count(Conversation.id)).where(
            Conversation.organization_id == organization_id,
            Conversation.is_escalated == True,
            Conversation.ticket_status == "resolved",
        )
        resolved_tickets = (await session.exec(resolved_tickets_stmt)).one() or 0

        return {
            "total_conversations": int(total_conv),
            "total_conversations_30d": int(conv_30d),
            "total_messages": int(total_msgs),
            "escalated_conversations": int(escalated_conv),
            "open_tickets_count": int(open_tickets),
            "resolved_tickets_count": int(resolved_tickets),
        }

    @staticmethod
    async def get_activity_in_date_range(
        session: AsyncSession,
        organization_id: uuid.UUID,
        start_date: datetime.datetime,
        end_date: datetime.datetime,
    ) -> Tuple[List[Tuple[datetime.datetime, bool]], List[datetime.datetime]]:
        """Retrieves conversation timestamps (with escalation flag) and message timestamps within the date window."""
        conv_stmt = (
            select(Conversation.created_at, Conversation.is_escalated)
            .where(
                Conversation.organization_id == organization_id,
                Conversation.created_at >= start_date,
                Conversation.created_at <= end_date,
            )
            .order_by(Conversation.created_at.asc())
        )
        conv_rows = list((await session.exec(conv_stmt)).all())

        msg_stmt = (
            select(Message.created_at)
            .join(Conversation, Message.conversation_id == Conversation.id)
            .where(
                Conversation.organization_id == organization_id,
                Message.created_at >= start_date,
                Message.created_at <= end_date,
            )
            .order_by(Message.created_at.asc())
        )
        msg_rows = list((await session.exec(msg_stmt)).all())

        return conv_rows, msg_rows

    @staticmethod
    async def get_fallback_queries(
        session: AsyncSession,
        organization_id: uuid.UUID,
        limit: int = 50,
        start_date: Optional[datetime.datetime] = None,
    ) -> List[Dict[str, Any]]:
        """Extracts visitor queries that triggered assistant fallback messages or lacked knowledge base citations."""
        # 1. Fetch assistant messages that responded with fallback
        conditions = [
            Conversation.organization_id == organization_id,
            Message.role == "assistant",
            Message.content.ilike("%I don't have information about that in my knowledge base%"),
        ]
        if start_date:
            conditions.append(Message.created_at >= start_date)

        fallback_stmt = (
            select(Message.conversation_id, Message.created_at)
            .join(Conversation, Message.conversation_id == Conversation.id)
            .where(*conditions)
            .order_by(Message.created_at.desc())
            .limit(limit)
        )
        fallback_rows = list((await session.exec(fallback_stmt)).all())
        if not fallback_rows:
            return []

        conv_ids = list({row[0] for row in fallback_rows})
        # 2. Fetch visitor messages for these conversations
        visitor_stmt = (
            select(Message.conversation_id, Message.content, Message.created_at)
            .join(Conversation, Message.conversation_id == Conversation.id)
            .where(
                Conversation.organization_id == organization_id,
                Message.role == "visitor",
                Message.conversation_id.in_(conv_ids),
            )
            .order_by(Message.created_at.asc())
        )
        visitor_rows = list((await session.exec(visitor_stmt)).all())

        # Group visitor messages by conversation
        visitor_by_conv = defaultdict(list)
        for c_id, content, created_at in visitor_rows:
            visitor_by_conv[c_id].append((created_at, content))

        results = []
        for conv_id, assistant_time in fallback_rows:
            # Find the most recent visitor message before the assistant's fallback
            msgs = visitor_by_conv.get(conv_id, [])
            prior_msgs = [m for m in msgs if m[0] <= assistant_time]
            if prior_msgs:
                last_visitor_time, last_question = prior_msgs[-1]
                results.append({
                    "question": last_question.strip(),
                    "asked_at": last_visitor_time,
                    "conversation_id": conv_id,
                })

        return results

    @staticmethod
    async def get_visitor_questions(
        session: AsyncSession,
        organization_id: uuid.UUID,
        limit: int = 100,
        start_date: Optional[datetime.datetime] = None,
    ) -> List[Tuple[str, datetime.datetime]]:
        """Retrieves raw visitor messages for the organization to compute top asked questions."""
        conditions = [
            Conversation.organization_id == organization_id,
            Message.role == "visitor",
        ]
        if start_date:
            conditions.append(Message.created_at >= start_date)

        stmt = (
            select(Message.content, Message.created_at)
            .join(Conversation, Message.conversation_id == Conversation.id)
            .where(*conditions)
            .order_by(Message.created_at.desc())
            .limit(limit)
        )
        return list((await session.exec(stmt)).all())


analytics_repo = AnalyticsRepo()
