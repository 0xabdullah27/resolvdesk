from fastapi import APIRouter, Depends, Query, status
from sqlmodel.ext.asyncio.session import AsyncSession

from app.core.auth import CurrentOwner
from app.core.database import get_db
from app.schemas.analytics import (
    AnalyticsOverviewResponse,
    AnalyticsTrendsResponse,
    KnowledgeGapsResponse,
    TopQuestionsResponse,
)
from app.services.analytics_service import analytics_service

router = APIRouter()


@router.get(
    "/overview",
    response_model=AnalyticsOverviewResponse,
    status_code=status.HTTP_200_OK,
    summary="Get analytics overview KPIs",
    description="Calculates executive KPIs including total conversations, 30-day volume, message counts, deflection rate, and ticket resolution status.",
)
async def get_analytics_overview(
    current_owner: CurrentOwner,
    session: AsyncSession = Depends(get_db),
) -> AnalyticsOverviewResponse:
    return await analytics_service.get_overview(
        session=session,
        organization_id=current_owner.organization_id,
    )


@router.get(
    "/trends",
    response_model=AnalyticsTrendsResponse,
    status_code=status.HTTP_200_OK,
    summary="Get daily conversation volume trends",
    description="Returns day-by-day conversation volume, AI resolutions, escalations, and messages over a flexible time window (7, 14, or 30 days) with continuous zero-filling.",
)
async def get_analytics_trends(
    current_owner: CurrentOwner,
    range_days: int = Query(default=7, description="Time window in days (7, 14, or 30)"),
    session: AsyncSession = Depends(get_db),
) -> AnalyticsTrendsResponse:
    return await analytics_service.get_daily_trends(
        session=session,
        organization_id=current_owner.organization_id,
        range_days=range_days,
    )


@router.get(
    "/knowledge-gaps",
    response_model=KnowledgeGapsResponse,
    status_code=status.HTTP_200_OK,
    summary="Get knowledge base gaps",
    description="Extracts and ranks visitor inquiries where the AI assistant had to fall back or lacked document citations, identifying missing documentation.",
)
async def get_knowledge_gaps(
    current_owner: CurrentOwner,
    limit: int = Query(default=10, ge=1, le=50, description="Max unanswered questions to return"),
    session: AsyncSession = Depends(get_db),
) -> KnowledgeGapsResponse:
    return await analytics_service.get_knowledge_gaps(
        session=session,
        organization_id=current_owner.organization_id,
        limit=limit,
    )


@router.get(
    "/top-questions",
    response_model=TopQuestionsResponse,
    status_code=status.HTTP_200_OK,
    summary="Get top customer questions",
    description="Ranks the most frequently asked customer questions across all website chat sessions.",
)
async def get_top_questions(
    current_owner: CurrentOwner,
    limit: int = Query(default=10, ge=1, le=50, description="Max top questions to return"),
    session: AsyncSession = Depends(get_db),
) -> TopQuestionsResponse:
    return await analytics_service.get_top_questions(
        session=session,
        organization_id=current_owner.organization_id,
        limit=limit,
    )
