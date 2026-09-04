from typing import Any, Dict, List
import tiktoken

from app.core.config import settings

_ENCODING_CACHE: Dict[str, tiktoken.Encoding] = {}


def get_encoding(name: str = "cl100k_base") -> tiktoken.Encoding:
    """Retrieves or caches a tiktoken encoding instance."""
    if name not in _ENCODING_CACHE:
        try:
            _ENCODING_CACHE[name] = tiktoken.get_encoding(name)
        except ValueError:
            _ENCODING_CACHE[name] = tiktoken.get_encoding("cl100k_base")
    return _ENCODING_CACHE[name]


def count_tokens(text: str, model_name: str = "cl100k_base") -> int:
    """Counts the exact number of tokens in a given text string."""
    encoding = get_encoding(model_name)
    return len(encoding.encode(text, disallowed_special=()))


def chunk_text(
    text: str,
    target_tokens: int = 500,
    overlap_tokens: int = 50,
    model_name: str = "cl100k_base",
) -> List[Dict[str, Any]]:
    """Partitions text into overlapping semantic token chunks.

    Returns a list of dicts with `chunk_index`, `text`, `token_count`.
    """
    if not text or not text.strip():
        return []

    encoding = get_encoding(model_name)
    tokens = encoding.encode(text, disallowed_special=())
    total_tokens = len(tokens)

    if total_tokens <= target_tokens:
        return [
            {
                "chunk_index": 0,
                "text": text.strip(),
                "token_count": total_tokens,
            }
        ]

    chunks: List[Dict[str, Any]] = []
    stride = max(1, target_tokens - overlap_tokens)

    chunk_idx = 0
    start = 0

    while start < total_tokens:
        end = min(start + target_tokens, total_tokens)
        chunk_token_slice = tokens[start:end]
        chunk_str = encoding.decode(chunk_token_slice).strip()

        if chunk_str:
            chunks.append(
                {
                    "chunk_index": chunk_idx,
                    "text": chunk_str,
                    "token_count": len(chunk_token_slice),
                }
            )
            chunk_idx += 1

        if end == total_tokens:
            break

        start += stride

    return chunks
