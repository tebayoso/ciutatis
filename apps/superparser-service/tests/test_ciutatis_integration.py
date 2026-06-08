from superparser.core.gemini_gateway import DeterministicEmbeddingClient, GeminiGateway
from superparser.core.pipeline import IngestionPipeline
from superparser.integrations.ciutatis import CiutatisHeartbeatHandler
from superparser.storage.memory import InMemorySuperparserRepository


class RecordingCiutatisClient:
    def __init__(self):
        self.comments = []
        self.documents = []

    def post_issue_comment(self, issue_id, body):
        self.comments.append((issue_id, body))

    def put_issue_document(self, issue_id, key, title, body):
        self.documents.append((issue_id, key, title, body))


def test_heartbeat_ingests_text_payload_and_posts_ciutatis_artifacts():
    repository = InMemorySuperparserRepository()
    pipeline = IngestionPipeline(
        repository=repository,
        gemini_gateway=GeminiGateway(api_key=None, embedding_client=DeterministicEmbeddingClient()),
    )
    client = RecordingCiutatisClient()
    handler = CiutatisHeartbeatHandler(pipeline=pipeline, ciutatis_client=client)

    result = handler.handle(
        {
            "companyId": "company-1",
            "issueId": "issue-1",
            "source": {
                "type": "inline_text",
                "filename": "memo.txt",
                "content": "City Council approved $125,000 for transit work.",
            },
        }
    )

    assert result["status"] == "succeeded"
    assert client.comments[0][0] == "issue-1"
    assert "Superparser completed" in client.comments[0][1]
    assert client.documents[0][1] == "superparser-extraction"
