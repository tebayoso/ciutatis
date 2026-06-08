from superparser.core.gemini_gateway import DeterministicEmbeddingClient, GeminiGateway
from superparser.core.pipeline import IngestionPipeline
from superparser.storage.memory import InMemorySuperparserRepository


def test_upload_ingestion_persists_document_chunks_extractions_and_classification():
    repository = InMemorySuperparserRepository()
    gateway = GeminiGateway(api_key=None, embedding_client=DeterministicEmbeddingClient())
    pipeline = IngestionPipeline(repository=repository, gemini_gateway=gateway)

    job = pipeline.ingest_upload(
        company_id="company-1",
        filename="hearing.csv",
        content_type="text/csv",
        data=b"agency,amount,date\nCity Council,125000,2026-06-01\n",
    )

    stored_job = repository.get_job(job.id)
    documents = repository.list_documents(company_id="company-1")
    chunks = repository.list_chunks(document_id=documents[0].id)
    extractions = repository.list_extractions(document_id=documents[0].id)

    assert stored_job.status == "succeeded"
    assert documents[0].company_id == "company-1"
    assert chunks[0].embedding
    assert any(item.type == "agency" and item.text == "City Council" for item in extractions)
    assert repository.list_classifications(document_id=documents[0].id)[0].label == "budget"


def test_semantic_search_returns_persisted_chunks_with_document_context():
    repository = InMemorySuperparserRepository()
    gateway = GeminiGateway(api_key=None, embedding_client=DeterministicEmbeddingClient())
    pipeline = IngestionPipeline(repository=repository, gemini_gateway=gateway)
    pipeline.ingest_upload(
        company_id="company-1",
        filename="ordinance.txt",
        content_type="text/plain",
        data=b"Ordinance 42 assigns Public Works a road repair budget.",
    )

    results = pipeline.search(company_id="company-1", query="road repair budget", limit=3)

    assert results
    assert results[0].document_title == "ordinance.txt"
    assert "road repair budget" in results[0].text
    assert next(iter(repository.search_queries.values())).result_count == len(results)
