from superparser.core.normalization import MAX_PDF_BYTES, normalize_source


def test_normalizes_csv_spreadsheet_into_flat_document():
    source = normalize_source(
        filename="procurement.csv",
        content_type="text/csv",
        data=b"agency,amount\nPublic Works,125000\nHealth,98000\n",
    )

    assert source.kind == "spreadsheet"
    assert "agency | amount" in source.text
    assert "Public Works | 125000" in source.text
    assert source.metadata["rowCount"] == 2
    assert source.metadata["columnCount"] == 2


def test_rejects_oversized_pdf_before_model_processing():
    payload = b"%PDF-1.7\n" + b"0" * (MAX_PDF_BYTES + 1)

    result = normalize_source(
        filename="oversized.pdf",
        content_type="application/pdf",
        data=payload,
    )

    assert result.kind == "rejected"
    assert result.metadata["reason"] == "pdf_too_large"
    assert result.metadata["limitBytes"] == MAX_PDF_BYTES


def test_extracts_basic_pdf_text_and_page_count_from_plain_pdf_fixture():
    payload = b"%PDF-1.7\n/Type /Page\n/Type /Page\nCity ordinance budget hearing"

    source = normalize_source(
        filename="ordinance.pdf",
        content_type="application/pdf",
        data=payload,
    )

    assert source.kind == "pdf"
    assert source.metadata["pageCount"] == 2
    assert "City ordinance budget hearing" in source.text
