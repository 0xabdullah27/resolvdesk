def parse_text(content: bytes, is_markdown: bool = False) -> str:
    """Parses plain text or Markdown bytes into a clean string preserving formatting."""
    try:
        text = content.decode("utf-8")
    except UnicodeDecodeError:
        text = content.decode("latin-1", errors="replace")

    # Remove null bytes which can disrupt Postgres text fields
    text = text.replace("\x00", "")

    # For both TXT and Markdown, we retain all structural elements.
    # Markdown headers (#, ##), bullet points, and code blocks provide essential
    # semantic context for subsequent LLM embedding and retrieval.
    return text.strip()
