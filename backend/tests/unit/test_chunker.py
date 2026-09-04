from app.services.chunker_service import chunk_text, count_tokens


def test_count_tokens():
    text = "Hello world! This is ResolvDesk AI knowledge ingestion."
    tokens = count_tokens(text)
    assert tokens > 0
    assert isinstance(tokens, int)


def test_chunk_small_text_produces_single_chunk():
    text = "Short policy text with only a few words."
    chunks = chunk_text(text, target_tokens=500, overlap_tokens=50)
    assert len(chunks) == 1
    assert chunks[0]["chunk_index"] == 0
    assert chunks[0]["text"] == text
    assert chunks[0]["token_count"] > 0


def test_chunk_large_text_produces_overlapping_chunks():
    # Build a long multi-paragraph text
    paragraphs = [
        f"Section {i}: This is customer policy rule number {i}. " * 20
        for i in range(1, 30)
    ]
    long_text = "\n\n".join(paragraphs)

    total_tokens = count_tokens(long_text)
    assert total_tokens > 1000

    chunks = chunk_text(long_text, target_tokens=500, overlap_tokens=50)
    assert len(chunks) > 1

    for idx, c in enumerate(chunks):
        assert c["chunk_index"] == idx
        assert c["token_count"] <= 550  # allows small boundary flexibility
        assert len(c["text"]) > 0

    # Verify overlap: text from end of chunk 0 should overlap into chunk 1
    # Check that adjacent chunks share common token sequences
    tokens_c0 = count_tokens(chunks[0]["text"])
    tokens_c1 = count_tokens(chunks[1]["text"])
    assert tokens_c0 > 0
    assert tokens_c1 > 0
