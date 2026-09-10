from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field


class MessageIntent(str, Enum):
    GREETING = "GREETING"
    GRATITUDE = "GRATITUDE"
    FAREWELL = "FAREWELL"
    BOT_IDENTITY = "BOT_IDENTITY"
    KNOWLEDGE_INQUIRY = "KNOWLEDGE_INQUIRY"
    HYBRID_INQUIRY = "HYBRID_INQUIRY"
    OUT_OF_SCOPE = "OUT_OF_SCOPE"
    HUMAN_ESCALATION = "HUMAN_ESCALATION"
    FALLBACK = "FALLBACK"


class IntentClassificationResult(BaseModel):
    intent: MessageIntent = Field(..., description="Classified intent category")
    tier: int = Field(default=1, description="Classification tier: 1 for heuristic, 2 for semantic/LLM")
    confidence: float = Field(default=1.0, description="Confidence score from 0.0 to 1.0")
    is_chitchat: bool = Field(default=False, description="True if query is conversational pleasantry with no knowledge retrieval needed")
    suggest_escalation: bool = Field(default=False, description="True if query indicates immediate human escalation")
    sample_topics: Optional[List[str]] = Field(default=None, description="Optional topic suggestions for out-of-scope redirection")
    response_override: Optional[str] = Field(default=None, description="Pre-composed instant response for Tier 1 intents")
