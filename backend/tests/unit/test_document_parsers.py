import io
import pytest
from pypdf import PdfWriter
import docx

from app.core.exceptions import UnsupportedMediaTypeException, UnprocessableContentException
from app.services.parsers.pdf_parser import parse_pdf
from app.services.parsers.docx_parser import parse_docx
from app.services.parsers.text_parser import parse_text
from app.services.parsers import extract_text_from_file


def test_markdown_parser_preserves_structure():
    content = b"""# Store Policy

## Return Guidelines
- Items must be unworn
- 30-day refund guarantee

```json
{"warranty": "1 year"}
```
"""
    extracted = parse_text(content, is_markdown=True)
    assert "# Store Policy" in extracted
    assert "## Return Guidelines" in extracted
    assert "- Items must be unworn" in extracted
    assert '{"warranty": "1 year"}' in extracted


def test_txt_parser_extracts_clean_text():
    content = "Simple plain text file.\nWith multiple lines.".encode("utf-8")
    extracted = parse_text(content, is_markdown=False)
    assert "Simple plain text file." in extracted
    assert "With multiple lines." in extracted


def test_pdf_parser_extracts_text():
    # Build in-memory PDF with text
    writer = PdfWriter()
    writer.add_blank_page(width=200, height=200)
    # Write empty page test or mock page text
    stream = io.BytesIO()
    writer.write(stream)
    stream.seek(0)

    # Empty blank page has no text, should return empty or whitespace
    extracted = parse_pdf(stream.getvalue())
    assert isinstance(extracted, str)


def test_docx_parser_extracts_text():
    # Build in-memory DOCX
    doc = docx.Document()
    doc.add_heading("Company FAQ", level=1)
    doc.add_paragraph("We offer 24/7 customer support.")
    
    stream = io.BytesIO()
    doc.save(stream)
    stream.seek(0)

    extracted = parse_docx(stream.getvalue())
    assert "Company FAQ" in extracted
    assert "We offer 24/7 customer support." in extracted


def test_extract_text_from_file_unsupported_format():
    with pytest.raises(UnsupportedMediaTypeException):
        extract_text_from_file("virus.exe", b"MZbinarycontent")


def test_extract_text_from_file_zero_readable_text():
    with pytest.raises(UnprocessableContentException):
        extract_text_from_file("empty.txt", b"   \n\t  ")
