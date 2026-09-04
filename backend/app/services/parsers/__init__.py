import os
from app.core.exceptions import UnsupportedMediaTypeException, UnprocessableContentException
from app.models.document import DocumentType
from app.services.parsers.pdf_parser import parse_pdf
from app.services.parsers.docx_parser import parse_docx
from app.services.parsers.text_parser import parse_text


def detect_document_type(filename: str) -> DocumentType:
    """Detects the document type enum from the filename extension."""
    _, ext = os.path.splitext(filename.lower())
    match ext:
        case ".pdf":
            return DocumentType.PDF
        case ".docx":
            return DocumentType.DOCX
        case ".txt":
            return DocumentType.TXT
        case ".md":
            return DocumentType.MD
        case _:
            raise UnsupportedMediaTypeException(
                f"Unsupported file extension '{ext}'. Allowed formats: .pdf, .docx, .txt, .md"
            )


def extract_text_from_file(filename: str, content: bytes) -> str:
    """Extracts plain text from supported document file types."""
    doc_type = detect_document_type(filename)

    match doc_type:
        case DocumentType.PDF:
            text = parse_pdf(content)
        case DocumentType.DOCX:
            text = parse_docx(content)
        case DocumentType.TXT:
            text = parse_text(content, is_markdown=False)
        case DocumentType.MD:
            text = parse_text(content, is_markdown=True)
        case _:
            raise UnsupportedMediaTypeException()

    cleaned = text.strip()
    if not cleaned:
        raise UnprocessableContentException("Document contains no readable text.")

    return cleaned


__all__ = [
    "detect_document_type",
    "extract_text_from_file",
    "parse_pdf",
    "parse_docx",
    "parse_text",
]
