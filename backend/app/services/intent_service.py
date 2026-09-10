import re
from typing import List, Optional
from app.schemas.intent import IntentClassificationResult, MessageIntent

# Standalone greeting expressions (case-insensitive, matched with word boundaries)
GREETING_REGEXES = [
    r"^hi\b",
    r"^hello\b",
    r"^hey\b",
    r"^hiya\b",
    r"^howdy\b",
    r"^heya\b",
    r"^good\s+(morning|afternoon|evening|day)\b",
    r"^greetings\b",
    r"^yo\b",
    r"^sup\b",
    # Multilingual greetings
    r"^hola\b",
    r"^bonjour\b",
    r"^salut\b",
    r"^salam\b",
    r"^assalam\s*(o|u)?\s*alaikum\b",
    r"^marhaba\b",
    r"^namaste\b",
]

GRATITUDE_REGEXES = [
    r"\bthank(s|\s+you|\s+u)\b",
    r"\bthx\b",
    r"\bappreciate\s+(it|you)\b",
    r"\bmuch\s+appreciated\b",
    r"\bgreat\s+help\b",
    r"\bmany\s+thanks\b",
]

FAREWELL_REGEXES = [
    r"\b(bye|goodbye|cya|farewell)\b",
    r"\bsee\s+(ya|you)\b",
    r"\bhave\s+a\s+(great|good|nice)\s+day\b",
    r"\btake\s+care\b",
]

IDENTITY_REGEXES = [
    r"\bwho\s+are\s+you\b",
    r"\bwhat\s+are\s+you\b",
    r"\bare\s+you\s+(an?\s+)?(ai|bot|robot|human|real\s+person)\b",
    r"\bwhat\s+can\s+you\s+(do|help\s+with)\b",
    r"\bwho\s+(created|made|built)\s+you\b",
]

ESCALATION_REGEXES = [
    r"\b(speak|talk)\s+to\s+(a\s+)?(human|person|agent|representative|manager)\b",
    r"\b(real\s+person|human\s+agent|human\s+support|live\s+agent)\b",
    r"\bconnect\s+(me\s+)?with\s+(a\s+)?(human|person|agent)\b",
    r"\bi\s+want\s+(a\s+)?human\b",
    r"\bthis\s+is\s+(useless|unhelpful|terrible|broken)\b",
    r"\b(you\s+are|you're)\s+(useless|not\s+helping)\b",
    r"\bstop\s+answering\s+with\s+a\s+bot\b",
]

# Business domain question signals that disqualify a turn from being a pure greeting
DOMAIN_INDICATOR_WORDS = {
    "shipping", "ship", "delivery", "deliver", "return", "returns", "refund", "refunds",
    "price", "pricing", "cost", "cancel", "cancellation", "order", "orders",
    "track", "tracking", "account", "login", "password", "warranty", "policy",
    "support", "feature", "features", "discount", "coupon", "hours", "contact",
    "location", "address", "phone", "email", "store", "buy", "purchase",
    "how", "what", "where", "when", "why", "who", "which", "can", "do", "does", "is", "are"
}


class IntentService:
    """Evaluates conversational intents using two tiers: fast heuristic matching and semantic context."""

    @staticmethod
    def clean_text(text: str) -> str:
        """Lowercases and strips leading/trailing punctuation and whitespace."""
        normalized = text.lower().strip()
        # Strip common sentence-ending punctuation
        normalized = re.sub(r"^[!?,.;:\s]+|[!?,.;:\s]+$", "", normalized)
        return normalized

    @classmethod
    def classify_fast_tier(
        cls,
        text: str,
        business_name: str,
        custom_greeting: Optional[str] = None,
    ) -> Optional[IntentClassificationResult]:
        """Evaluates message against fast regex and keyword patterns.
        
        Returns IntentClassificationResult if a definitive Tier 1 intent matches, or None to fall back to Tier 2.
        """
        clean = cls.clean_text(text)
        if not clean:
            # Empty or punctuation-only input
            return IntentClassificationResult(
                intent=MessageIntent.GREETING,
                tier=1,
                confidence=1.0,
                is_chitchat=True,
                response_override=f"Hello! How can I help you with {business_name} today?",
            )

        # 1. Explicit Human Escalation Check (highest priority for safety net)
        for pattern in ESCALATION_REGEXES:
            if re.search(pattern, clean):
                return IntentClassificationResult(
                    intent=MessageIntent.HUMAN_ESCALATION,
                    tier=1,
                    confidence=1.0,
                    is_chitchat=False,
                    suggest_escalation=True,
                    response_override=cls.generate_escalation_response(),
                )

        # 2. Check for Bot Identity / Capability Inquiry
        for pattern in IDENTITY_REGEXES:
            if re.search(pattern, clean):
                return IntentClassificationResult(
                    intent=MessageIntent.BOT_IDENTITY,
                    tier=1,
                    confidence=1.0,
                    is_chitchat=True,
                    suggest_escalation=False,
                    response_override=cls.generate_identity_response(business_name),
                )

        # 3. Check for Farewell
        for pattern in FAREWELL_REGEXES:
            if re.search(pattern, clean):
                return IntentClassificationResult(
                    intent=MessageIntent.FAREWELL,
                    tier=1,
                    confidence=1.0,
                    is_chitchat=True,
                    suggest_escalation=False,
                    response_override=cls.generate_farewell_response(),
                )

        # 4. Check for Gratitude
        for pattern in GRATITUDE_REGEXES:
            if re.search(pattern, clean):
                return IntentClassificationResult(
                    intent=MessageIntent.GRATITUDE,
                    tier=1,
                    confidence=1.0,
                    is_chitchat=True,
                    suggest_escalation=False,
                    response_override=cls.generate_gratitude_response(),
                )

        # 5. Check for Greetings
        is_greeting_start = any(re.search(pat, clean) for pat in GREETING_REGEXES)
        if is_greeting_start:
            tokens = set(re.findall(r"\b\w+\b", clean))
            # Check if this is a compound / hybrid greeting (e.g. "Hello, do you ship to Canada?")
            domain_tokens = tokens.intersection(DOMAIN_INDICATOR_WORDS)
            has_domain_indicators = len(domain_tokens) > 0 and len(clean) > 20

            if has_domain_indicators:
                # Disambiguated as Hybrid Inquiry -> Defer to Tier 2 RAG with hybrid flag
                return IntentClassificationResult(
                    intent=MessageIntent.HYBRID_INQUIRY,
                    tier=2,
                    confidence=0.9,
                    is_chitchat=False,
                    suggest_escalation=False,
                )
            else:
                # Pure standalone greeting
                return IntentClassificationResult(
                    intent=MessageIntent.GREETING,
                    tier=1,
                    confidence=1.0,
                    is_chitchat=True,
                    suggest_escalation=False,
                    response_override=cls.generate_greeting_response(business_name, custom_greeting),
                )

        # No fast-path match -> Defer to Tier 2 (Knowledge Search)
        return None

    @staticmethod
    def generate_greeting_response(business_name: str, custom_greeting: Optional[str] = None) -> str:
        if custom_greeting and custom_greeting.strip():
            return custom_greeting.strip()
        return (
            f"Hello! Welcome to {business_name}. I'm your AI customer assistant. "
            "How can I help you today with our products, policies, or services?"
        )

    @staticmethod
    def generate_gratitude_response() -> str:
        return "You're very welcome! Let me know if there's anything else I can help you with."

    @staticmethod
    def generate_farewell_response() -> str:
        return "Have a wonderful day! Feel free to reach out anytime if you have more questions."

    @staticmethod
    def generate_identity_response(business_name: str) -> str:
        return (
            f"I am the virtual customer support assistant for {business_name}. "
            "I can answer questions regarding our products, services, pricing, shipping, and support policies "
            "based on our verified documentation."
        )

    @staticmethod
    def generate_escalation_response() -> str:
        return (
            "I understand you would like to speak with a human team member. "
            "Please provide your contact details below so our team can follow up directly:"
        )

    @staticmethod
    def generate_out_of_scope_deflection(
        business_name: str,
        sample_topics: Optional[List[str]] = None,
    ) -> str:
        if sample_topics:
            topics_str = ", ".join(f"'{t}'" for t in sample_topics[:3])
            return (
                f"I am specialized to assist with inquiries regarding {business_name} "
                f"(such as our documentation on {topics_str}). "
                "How can I help you with our services today?"
            )
        return (
            f"I am specialized to assist with inquiries regarding {business_name}. "
            "How can I help you with our products or services today?"
        )


intent_service = IntentService()
