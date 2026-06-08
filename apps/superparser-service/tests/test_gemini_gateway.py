from superparser.core.gemini_gateway import GeminiGateway


class FlakyEmbeddingClient:
    def __init__(self):
        self.calls = 0

    def embed(self, texts, model):
        self.calls += 1
        if self.calls == 1:
            raise RuntimeError("transient quota error")
        return [[float(len(text)), 1.0, 0.5] for text in texts]


def test_embedding_gateway_retries_transient_failures():
    client = FlakyEmbeddingClient()
    gateway = GeminiGateway(api_key="test-key", embedding_client=client, max_retries=2)

    embeddings = gateway.embed_texts(["ordinance", "budget"])

    assert client.calls == 2
    assert embeddings == [[9.0, 1.0, 0.5], [6.0, 1.0, 0.5]]
