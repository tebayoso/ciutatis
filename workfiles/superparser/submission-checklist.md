# Superparser Challenge Submission Checklist

Date: 2026-06-08

## Required

- Code: `apps/superparser-service`, `apps/superparser-portal`, and Ciutatis adapter template.
- Video: use `workfiles/superparser/video-script.md`.
- Architecture diagram: use `workfiles/superparser/architecture.md`.
- Testing access: provide portal URL, service health URL, and demo credentials or shared test key if private.
- Category: Build / Net-New Agents.
- Region: AMERS unless submission account requires another region.

## Demo Proof Points

- Upload or submit a government document source.
- Show extraction status and grounded spans.
- Show classification and metadata panel.
- Run semantic search.
- Show Ciutatis issue artifact callback.

## Environment Checklist

- `GOOGLE_API_KEY` stored in Secret Manager.
- `SUPERPARSER_DATABASE_URL` stored in Secret Manager.
- Cloud SQL migration `apps/superparser-service/migrations/001_superparser_schema.sql` applied.
- Cloud Run service deployed and reachable.
- Portal points to Cloud Run URL.
- `apps/superparser-service/ciutatis-agent-template.json` updated with the Cloud Run URL and shared secret.
