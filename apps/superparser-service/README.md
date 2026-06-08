# Superparser Service

Standalone GovOps extraction agent service for the Google AI Agents Challenge.

## Run Locally

```sh
cd apps/superparser-service
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
python -m superparser.main
```

Without `DATABASE_URL`, the service uses in-memory storage for demo runs. Set `GOOGLE_API_KEY`
to use Gemini embeddings; otherwise deterministic local embeddings are used.

## API

- `GET /health`
- `POST /v1/ingestions`
- `GET /v1/ingestions/{jobId}`
- `GET /v1/documents?company_id=demo-company`
- `GET /v1/documents/{documentId}`
- `GET /v1/documents/{documentId}/extractions`
- `POST /v1/search`
- `POST /v1/ciutatis/heartbeat`
- `POST /v1/mcp/tools/ingest_document`
- `POST /v1/mcp/tools/search_documents`

## Cloud Run

```sh
gcloud builds submit --tag us-central1-docker.pkg.dev/$GOOGLE_CLOUD_PROJECT/superparser/superparser-service:latest
gcloud run deploy superparser-service \
  --image us-central1-docker.pkg.dev/$GOOGLE_CLOUD_PROJECT/superparser/superparser-service:latest \
  --region us-central1 \
  --set-secrets GOOGLE_API_KEY=GOOGLE_API_KEY:latest,SUPERPARSER_DATABASE_URL=SUPERPARSER_DATABASE_URL:latest
```

Apply `migrations/001_superparser_schema.sql` to Cloud SQL before enabling `DATABASE_URL`.
