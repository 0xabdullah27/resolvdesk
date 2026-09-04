import io
from pypdf import PdfReader
from app.core.logging import get_logger

logger = get_logger(__name__)


def parse_pdf(content: bytes) -> str:
    """Extracts plain text from text-extractable PDF bytes in-memory."""
    stream = io.BytesIO(content)
    try:
        reader = PdfReader(stream)
        page_texts = []
        for i, page in enumerate(reader.pages):
            text = page.extract_text()
            if text:
                page_texts.append(text.strip())
        return "\n\n".join(page_texts).strip()
    except Exception as e:
        logger.warning("pdf_extraction_failed", error=str(e))
        return ""
