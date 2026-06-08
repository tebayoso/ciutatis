from superparser.core.extraction import ExtractionSchema, filter_grounded_extractions, run_extraction


def test_filters_ungrounded_langextract_results():
    grounded = filter_grounded_extractions(
        [
            {"text": "Public Works", "type": "agency", "char_interval": {"start_pos": 4, "end_pos": 16}},
            {"text": "Hallucinated Agency", "type": "agency", "char_interval": None},
        ]
    )

    assert len(grounded) == 1
    assert grounded[0]["text"] == "Public Works"
    assert grounded[0]["sourceSpan"] == {"start": 4, "end": 16}


def test_fallback_extraction_produces_grounded_government_fields():
    result = run_extraction(
        "The City Council approved Ordinance 42 for $125,000 on 2026-06-01.",
        schema=ExtractionSchema.default_govops(),
    )

    texts = {item["text"] for item in result.extractions}
    assert "City Council" in texts
    assert "$125,000" in texts
    assert "2026-06-01" in texts
    assert all(item["sourceSpan"]["start"] >= 0 for item in result.extractions)
