import json
from typing import AsyncGenerator, Dict, List, Optional
import httpx

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class LLMService:
    """Provider-agnostic OpenAI-compatible LLM client supporting real-time streaming."""

    def __init__(
        self,
        base_url: Optional[str] = None,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
    ):
        self.base_url = (base_url or settings.LLM_BASE_URL).rstrip("/")
        self.api_key = api_key or settings.LLM_API_KEY
        self.model = model or settings.LLM_MODEL

    async def stream_completion(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.2,
        max_tokens: int = 800,
    ) -> AsyncGenerator[str, None]:
        """Streams token deltas from an OpenAI-compatible /v1/chat/completions endpoint."""
        url = f"{self.base_url}/chat/completions"
        headers = {
            "Content-Type": "application/json",
            "Accept": "text/event-stream",
        }
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        payload = {
            "model": self.model,
            "messages": messages,
            "stream": True,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }

        logger.info(
            "llm_stream_request_started",
            model=self.model,
            url=url,
            message_count=len(messages),
        )

        timeout = httpx.Timeout(30.0, connect=10.0)
        async with httpx.AsyncClient(timeout=timeout) as client:
            try:
                async with client.stream("POST", url, json=payload, headers=headers) as response:
                    if response.status_code != 200:
                        error_body = await response.aread()
                        logger.error(
                            "llm_stream_http_error",
                            status_code=response.status_code,
                            error=error_body.decode(errors="replace"),
                        )
                        yield "I apologize, but I am having trouble connecting to my reasoning service. Please try again in a moment."
                        return

                    async for line in response.aiter_lines():
                        line = line.strip()
                        if not line:
                            continue
                        if line.startswith("data: "):
                            data_str = line[6:].strip()
                            if data_str == "[DONE]":
                                break
                            try:
                                chunk_json = json.loads(data_str)
                                choices = chunk_json.get("choices", [])
                                if choices:
                                    delta = choices[0].get("delta", {})
                                    content = delta.get("content")
                                    if content:
                                        yield content
                            except json.JSONDecodeError:
                                logger.debug("llm_stream_invalid_json_line", line=line)
                                continue
            except Exception as exc:
                logger.error("llm_stream_exception", error=str(exc))
                yield "I encountered an error processing your request. Please try again in a moment."


llm_service = LLMService()
