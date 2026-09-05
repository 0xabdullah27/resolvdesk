import datetime
import uuid
from collections import defaultdict
from typing import List, Optional

from sqlmodel.ext.asyncio.session import AsyncSession

from app.models.conversation import utc_now
from app.repos.analytics_repo import analytics_repo
from app.schemas.analytics import (
    AnalyticsOverviewResponse,
    AnalyticsTrendsResponse,
    DailyVolumePoint,
    KnowledgeGapItem,
    KnowledgeGapsResponse,
    TopQuestionItem,
    TopQuestionsResponse,
)


class AnalyticsService:
    """Service handling business logic, calculations, and aggregation for analytics metrics."""

    async def get_overview(
        self,
        session: AsyncSession,
        organization_id: uuid.UUID,
    ) -> AnalyticsOverviewResponse:
        """Computes top-level KPI metrics including AI deflection rate and ticket resolution status."""
        raw = await analytics_repo.get_overview_metrics(session, organization_id)
        total_conv = raw["total_conversations"]
        escalated_conv = raw["escalated_conversations"]

        # Calculate deflection rate percentage (avoid division by zero)
        if total_conv == 0:
            deflection_rate = 100.0
        else:
            resolved_by_ai = max(0, total_conv - escalated_conv)
            deflection_rate = round((resolved_by_ai / total_conv) * 100.0, 1)

        return AnalyticsOverviewResponse(
            total_conversations=total_conv,
            total_conversations_30d=raw["total_conversations_30d"],
            total_messages=raw["total_messages"],
            escalated_conversations=escalated_conv,
            deflection_rate=deflection_rate,
            open_tickets_count=raw["open_tickets_count"],
            resolved_tickets_count=raw["resolved_tickets_count"],
        )

    async def get_daily_trends(
        self,
        session: AsyncSession,
        organization_id: uuid.UUID,
        range_days: int = 7,
    ) -> AnalyticsTrendsResponse:
        """Builds a continuous day-by-day activity trend with zero-padding for quiet days."""
        # Restrict range_days to supported windows: 7, 14, or 30 days (default to 7)
        if range_days not in (7, 14, 30):
            range_days = 7

        now = utc_now()
        start_date = (now - datetime.timedelta(days=range_days - 1)).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        end_date = now

        conv_rows, msg_rows = await analytics_repo.get_activity_in_date_range(
            session=session,
            organization_id=organization_id,
            start_date=start_date,
            end_date=end_date,
        )

        # Pre-seed every single date in the window with 0 counts to prevent chart gaps
        daily_buckets: dict[str, dict[str, int]] = {}
        curr = start_date.date()
        today = now.date()
        while curr <= today:
            d_str = curr.strftime("%Y-%m-%d")
            daily_buckets[d_str] = {
                "total_conversations": 0,
                "escalated": 0,
                "total_messages": 0,
            }
            curr += datetime.timedelta(days=1)

        # Aggregate conversations by date
        for created_at, is_escalated in conv_rows:
            d_str = created_at.strftime("%Y-%m-%d")
            if d_str in daily_buckets:
                daily_buckets[d_str]["total_conversations"] += 1
                if is_escalated:
                    daily_buckets[d_str]["escalated"] += 1

        # Aggregate messages by date
        for created_at in msg_rows:
            d_str = created_at.strftime("%Y-%m-%d")
            if d_str in daily_buckets:
                daily_buckets[d_str]["total_messages"] += 1

        points: List[DailyVolumePoint] = []
        for d_str, counts in sorted(daily_buckets.items()):
            tot_c = counts["total_conversations"]
            esc_c = counts["escalated"]
            ai_res = max(0, tot_c - esc_c)
            points.append(
                DailyVolumePoint(
                    date=d_str,
                    total_conversations=tot_c,
                    ai_resolved=ai_res,
                    escalated=esc_c,
                    total_messages=counts["total_messages"],
                )
            )

        return AnalyticsTrendsResponse(range_days=range_days, points=points)

    async def get_knowledge_gaps(
        self,
        session: AsyncSession,
        organization_id: uuid.UUID,
        limit: int = 10,
    ) -> KnowledgeGapsResponse:
        """Groups and ranks unanswered customer questions to highlight missing knowledge base topics."""
        limit = min(max(1, limit), 50)
        raw_fallbacks = await analytics_repo.get_fallback_queries(
            session=session,
            organization_id=organization_id,
            limit=limit * 5,
        )

        if not raw_fallbacks:
            return KnowledgeGapsResponse(items=[], total=0)

        # Group by normalized lowercase question string
        grouped: dict[str, dict] = {}
        for item in raw_fallbacks:
            q_text = item["question"]
            norm_key = q_text.lower().strip()
            if not norm_key:
                continue

            if norm_key not in grouped:
                grouped[norm_key] = {
                    "question": q_text,
                    "frequency": 0,
                    "last_asked_at": item["asked_at"],
                    "conversation_id": item["conversation_id"],
                }
            grouped[norm_key]["frequency"] += 1
            if item["asked_at"] > grouped[norm_key]["last_asked_at"]:
                grouped[norm_key]["last_asked_at"] = item["asked_at"]
                grouped[norm_key]["conversation_id"] = item["conversation_id"]

        # Sort by frequency descending, then recency
        sorted_items = sorted(
            grouped.values(),
            key=lambda x: (x["frequency"], x["last_asked_at"]),
            reverse=True,
        )[:limit]

        gap_items = [
            KnowledgeGapItem(
                question=item["question"],
                frequency=item["frequency"],
                last_asked_at=item["last_asked_at"],
                conversation_id=item["conversation_id"],
            )
            for item in sorted_items
        ]

        return KnowledgeGapsResponse(items=gap_items, total=len(gap_items))

    async def get_top_questions(
        self,
        session: AsyncSession,
        organization_id: uuid.UUID,
        limit: int = 10,
    ) -> TopQuestionsResponse:
        """Aggregates and normalizes the most frequent customer inquiries."""
        limit = min(max(1, limit), 50)
        raw_msgs = await analytics_repo.get_visitor_questions(
            session=session,
            organization_id=organization_id,
            limit=limit * 10,
        )

        if not raw_msgs:
            return TopQuestionsResponse(items=[], total=0)

        # Filter out trivial greetings
        ignored_greetings = {"hi", "hello", "hey", "test", "hola", "sup", "good morning", "good evening"}

        grouped: dict[str, dict] = {}
        for content, created_at in raw_msgs:
            clean = content.strip()
            norm_key = clean.lower()
            if not clean or norm_key in ignored_greetings or len(clean) < 3:
                continue

            if norm_key not in grouped:
                grouped[norm_key] = {
                    "question": clean,
                    "frequency": 0,
                    "last_asked_at": created_at,
                }
            grouped[norm_key]["frequency"] += 1
            if created_at > grouped[norm_key]["last_asked_at"]:
                grouped[norm_key]["last_asked_at"] = created_at

        sorted_items = sorted(
            grouped.values(),
            key=lambda x: (x["frequency"], x["last_asked_at"]),
            reverse=True,
        )[:limit]

        top_items = [
            TopQuestionItem(
                question=item["question"],
                frequency=item["frequency"],
                last_asked_at=item["last_asked_at"],
            )
            for item in sorted_items
        ]

        return TopQuestionsResponse(items=top_items, total=len(top_items))


analytics_service = AnalyticsService()
