import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class AnalyticsOverviewResponse(BaseModel):
    """Executive metrics and deflection KPIs for the owner's organization."""
    total_conversations: int = Field(..., description="All-time total conversation sessions")
    total_conversations_30d: int = Field(..., description="Conversations initiated in the last 30 days")
    total_messages: int = Field(..., description="Total messages across all organization conversations")
    escalated_conversations: int = Field(..., description="Conversations escalated to a human ticket")
    deflection_rate: float = Field(..., description="Percentage of inquiries resolved by AI without escalation (0.0 - 100.0)")
    open_tickets_count: int = Field(..., description="Active escalated tickets currently open or in-progress")
    resolved_tickets_count: int = Field(..., description="Tickets that have been marked resolved")

    model_config = ConfigDict(from_attributes=True)


class DailyVolumePoint(BaseModel):
    """A single day's activity metrics for trend charts."""
    date: str = Field(..., description="ISO date format YYYY-MM-DD")
    total_conversations: int = Field(default=0, description="Total conversations started on this date")
    ai_resolved: int = Field(default=0, description="Conversations handled by AI without escalation")
    escalated: int = Field(default=0, description="Conversations that were escalated to a ticket")
    total_messages: int = Field(default=0, description="Total visitor and assistant messages on this date")


class AnalyticsTrendsResponse(BaseModel):
    """Daily activity volume trends over a selected rolling window."""
    range_days: int = Field(..., description="Selected time window (e.g. 7, 14, 30)")
    points: List[DailyVolumePoint] = Field(..., description="Continuous day-by-day activity points")


class KnowledgeGapItem(BaseModel):
    """An unanswered visitor question where AI fell back or lacked knowledge base citations."""
    question: str = Field(..., description="Normalized visitor query")
    frequency: int = Field(..., description="Number of times this question was asked")
    last_asked_at: datetime = Field(..., description="Timestamp of most recent occurrence")
    conversation_id: Optional[uuid.UUID] = Field(default=None, description="Sample conversation ID containing this query")


class KnowledgeGapsResponse(BaseModel):
    """List of detected knowledge gaps to guide owner document creation."""
    items: List[KnowledgeGapItem]
    total: int


class TopQuestionItem(BaseModel):
    """A frequently asked customer question across all chat interactions."""
    question: str = Field(..., description="Normalized visitor inquiry text")
    frequency: int = Field(..., description="Frequency count")
    last_asked_at: datetime = Field(..., description="Timestamp of most recent inquiry")


class TopQuestionsResponse(BaseModel):
    """List of top customer questions for intent insight."""
    items: List[TopQuestionItem]
    total: int
