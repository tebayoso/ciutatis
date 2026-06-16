from superparser.core.gemini_gateway import DeterministicEmbeddingClient, GeminiGateway
from superparser.core.pipeline import IngestionPipeline, content_hash
from superparser.storage.memory import InMemorySuperparserRepository


def _pipeline() -> IngestionPipeline:
    gateway = GeminiGateway(api_key=None, embedding_client=DeterministicEmbeddingClient())
    return IngestionPipeline(repository=InMemorySuperparserRepository(), gemini_gateway=gateway)


def test_collaborate_ingests_a_new_document():
    pipeline = _pipeline()

    result = pipeline.collaborate(
        company_id="public-contributions",
        filename="budget.csv",
        content_type="text/csv",
        data=b"agency,amount,date\nCity Council,125000,2026-06-01\n",
    )

    assert result["status"] == "ingested"
    assert result["contentHash"].startswith("sha256:")
    assert result["document"]["title"] == "budget.csv"
    # Classification + grounded extractions ride along so the citizen sees what we found.
    assert result["document"]["classification"]["label"] == "budget"
    assert any(item["type"] == "agency" for item in result["document"]["extractions"])


def test_collaborate_recognises_an_exact_reupload_without_reprocessing():
    pipeline = _pipeline()
    data = b"Ordinance 42 assigns Public Works a road repair budget."

    first = pipeline.collaborate(
        company_id="public-contributions",
        filename="ordinance.txt",
        content_type="text/plain",
        data=data,
    )
    second = pipeline.collaborate(
        company_id="public-contributions",
        filename="ordinance-renamed.txt",  # same bytes, different name
        content_type="text/plain",
        data=data,
    )

    assert first["status"] == "ingested"
    assert second["status"] == "duplicate"
    # Dedup points back at the document we already aggregated — no second copy.
    assert second["document"]["id"] == first["document"]["id"]
    assert second["contentHash"] == content_hash(data)
    assert len(pipeline.repository.list_documents("public-contributions")) == 1


def test_collaborate_surfaces_possible_duplicates_as_advisory():
    pipeline = _pipeline()
    pipeline.collaborate(
        company_id="public-contributions",
        filename="road-budget-2025.txt",
        content_type="text/plain",
        data=b"Ordinance 42 assigns Public Works a road repair budget for 2025.",
    )

    # Near-identical content, but not byte-identical -> hash dedup can't catch it,
    # so it must ingest AND flag the earlier doc as a possible duplicate.
    result = pipeline.collaborate(
        company_id="public-contributions",
        filename="road-budget-2026.txt",
        content_type="text/plain",
        data=b"Ordinance 42 assigns Public Works a road repair budget for 2026.",
    )

    assert result["status"] == "ingested"
    titles = [item["title"] for item in result["possibleDuplicates"]]
    assert "road-budget-2025.txt" in titles
