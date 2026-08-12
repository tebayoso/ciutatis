# Civic Data Platform — Ingest, Parse, and Warehouse Schema

Status: Draft chapters (ingest + parse + warehouse) of the Civic Data Platform spec
Date: 2026-08-12
Audience: Product, engineering, warehouse, and public-portal authors
Parent: Civic Data Platform (full spec). These chapters are the system-of-record contract for civic documents, facts, and SQL.

`doc/SPEC.md` remains the long-horizon control-plane product spec.
`doc/SPEC-implementation.md` remains the V1 control-plane build contract.
This document is the Civic Data Platform data contract. When this document conflicts with Superparser’s current HTTP surface, this document wins for the TO-BE platform.

---

## 0. Locked decisions (AS-IS → TO-BE)

| Topic | AS-IS (repo today) | TO-BE (locked) |
|---|---|---|
| Superparser role | Standalone GovOps agent with ingest **and** query APIs (`POST /v1/search`, `GET /v1/documents`) on its own Postgres + pgvector | **Ingest worker only.** It normalizes, chunks, extracts, classifies, and writes into the warehouse. It is not the query API. |
| System of record | Superparser Postgres schema `superparser.*` (`apps/superparser-service/migrations/001_superparser_schema.sql`) plus D1 OLTP | **Dedicated Postgres warehouse** is system of record for civic datasets, documents, chunks, facts, entities, links, classifications, published views, usage, saved SQL, and dashboards |
| Object store | Control-plane R2 bucket `ciutatis-assets` (`workers/api/wrangler.toml` `ASSETS`) for board assets; Superparser keeps `flat_text` in Postgres | Same R2 (or a dedicated `ciutatis-warehouse` bucket). Raw bytes always land in R2. **Optional Parquet** on R2 for large scans |
| Query UI | Superparser portal is a **standalone demo** (`apps/superparser-portal`). Scrutiny page is marketing copy (`apps/landing/src/admin/pages/ScrutinyPage.tsx`). **No SQL warehouse, no Dune UI** | Superparser portal **folds into Next** (`apps/landing`). SQL users hit `published` views. Dashboards/tiles are the Dune-like UI (specified here; not built) |
| Collaborate | `POST /api/public/collaborate` returns **503** while `SUPERPARSER_URL = ""` (`workers/api/wrangler.toml` lines 26–29; `workers/api/src/routes/collaborate.ts` lines 67–72) | Same public path stays. Worker remains a thin quota/type proxy. Superparser URL is required in production. Results are written to the warehouse, not queried from Superparser |
| OLTP | Cloudflare D1: `geo_entities`, `public_requests`, `public_contributions`, `companies` (institutions), `cost_events` | D1 stays OLTP. Warehouse **mirrors** those IDs via ETL. Facts/entities join on those IDs. Warehouse does not become the write path for citizen requests |
| Facts | `superparser.extractions` rows with `type` + `text` + `source_span_json` + `attributes_json` (`govops_v1`) | Typed **facts with provenance**. Every fact cites document, chunk, char span, extractor version, and optional human review |
| Visibility | Superparser is company-scoped (`company_id` text). Collaborate hard-codes `public-contributions` | Dataset visibility: **`private` → `government` → `public`**. SQL default search_path is `published`, which only exposes rows allowed for the caller |
| PII | Public requests run `redactPublicText` (`packages/shared/src/public-portal.ts`). Superparser stores raw `flat_text` with **no** redaction | Warehouse applies the **same redaction library** to any text that can enter `published`. Unredacted text is private-only |

### 0.1 Runtime topology (TO-BE)

```
Citizen / operator / agent
        │
        ▼
Next (apps/landing)  ─── folded Superparser portal UI
        │
        ▼
workers/api  (Hono)
  /api/public/collaborate   quota + type gate
  /api/companies/:id/ingest operator ingest
  /api/sql/*                published-only SQL (future Dune UI)
        │
        ├─ D1 OLTP (control plane)     geo_entities, public_requests,
        │                              public_contributions, companies,
        │                              cost_events, finance_events
        │
        ├─ R2                          raw bytes + optional Parquet
        │
        └─ Superparser ingest worker   Cloud Run (as-is deploy shape)
                │                      apps/superparser-service
                ▼
        Postgres warehouse             system of record
          ingest.*                     jobs, quotas, blobs
          warehouse.*                  datasets, documents, chunks, facts, …
          oltp.*                       mirrored D1
          published.*                  what SQL can see by default
```

Superparser keeps its current process (FastAPI on Cloud Run, `apps/superparser-service/cloud-run.yaml`) but **loses public query duties**. `POST /v1/search`, `GET /v1/documents`, and MCP `search_documents` become internal debug endpoints or are removed after cutover. The worker writes warehouse rows (or a warehouse ingest API that Superparser calls). Superparser’s own `superparser.*` schema is a **legacy staging store** during migration, then retired.

---

## 1. Ingest

### 1.1 Sources

Every ingest job has exactly one `source_kind`. Source kinds are closed. New kinds require a spec + extractor change.

| `source_kind` | Who triggers it | AS-IS entrypoint | Bytes origin | `source_ref` convention |
|---|---|---|---|---|
| `upload` | Board operator or institution staff | `POST /v1/ingestions` multipart (`apps/superparser-service/superparser/api.py` `create_ingestion`) | Request body | original filename |
| `collaborate` | Citizen (anon or signed-in) | `POST /api/public/collaborate` → `POST /v1/collaborate` (`workers/api/src/routes/collaborate.ts`, `api.py` `collaborate`) | Multipart `file` | original filename |
| `drive` | Operator or heartbeat with Drive id | `POST /v1/ingestions` JSON `source.type=drive` (`api.py` lines 71–93; `superparser/clients/drive.py`) | Google Drive `files.get` / `export_media` | Drive file id |
| `inline_text` | Control-plane heartbeat / MCP | `POST /v1/ciutatis/heartbeat`, `POST /v1/mcp/tools/ingest_document` (`superparser/integrations/ciutatis.py`, `api.py`) | UTF-8 from JSON | filename or issue id |
| `url` | Operator or scheduled fetch | **not built** | HTTP GET into R2 then ingest | canonical URL |
| `oltp_export` | ETL job (this spec §6) | **not built** | D1 snapshot, not a citizen file | `d1:{table}:{pk}` |

Allowed content types are the union of the Collaborate gate and Superparser normalizer:

| Extension / MIME | AS-IS worker allow (`collaborate.ts` `ALLOWED_*`) | AS-IS Superparser normalize (`normalization.py`) | TO-BE |
|---|---|---|---|
| `.pdf` `application/pdf` | yes | yes; reject `> 50 MiB` or `> 1000` pages (`MAX_PDF_BYTES`, `MAX_PDF_PAGES`) | same hard caps; store original in R2 |
| `.csv` `text/csv` | yes | yes; flattened `" \| "` rows | same |
| `.xlsx` OOXML sheet | yes | yes via `openpyxl` | same |
| `.xls` `application/vnd.ms-excel` | **allowed by worker** | **not handled** (falls through to `_decode_text`) | **reject 415** unless converted to `.xlsx`/`.csv` before enqueue |
| `.txt` `.md` `text/plain` `text/markdown` | yes | yes | same |
| `.json` `application/json` | **allowed by worker** | treated as text (`_decode_text`) | ingest as `text` kind; JSON object/array is flattened to lines `key: value` / row JSON; invalid JSON is still stored as text with `metadata.flatten="raw"` |
| Google native Doc/Sheet | Drive path only | Sheet → `text/csv`, Doc → `text/plain` (`drive.py` `_export_content_type`) | same export map |
| `application/octet-stream` | allowed as browser fallback | sniffed by filename | sniff by magic + filename; if unknown → `rejected` |

Drive metadata captured today (`drive_metadata.py` `DriveSourceMetadata`) is preserved on the document: `source_id`, `title`, `mime_type`, `owners[]`, `last_modifier`, `created_time`, `modified_time`, `web_view_link`, revision count. Owners’ emails are **PII** and never copied into `published`.

Heartbeat ingest (`ciutatis-agent-template.json`, `CiutatisHeartbeatHandler.handle`) today posts a comment and a markdown issue document back to the control plane. TO-BE keeps that **notification** side-effect, but the extraction payload lives in the warehouse, not in Superparser Postgres (the current comment text in `_build_issue_document` already says this; after cutover it must be true).

### 1.2 Job states

AS-IS check constraint (`001_superparser_schema.sql`):

```sql
status text not null check (status in ('queued', 'running', 'succeeded', 'failed'))
```

The Python pipeline never writes `queued`: `ingest_upload` inserts `running` immediately (`pipeline.py` lines 62–68). Collaborate short-circuits to an application-level `duplicate` **without** a job row (`pipeline.py` `collaborate`).

TO-BE closed set:

| Status | Meaning | Terminal? |
|---|---|---|
| `accepted` | Worker passed quota/type/size; job row exists; blob may still be uploading to R2 | no |
| `queued` | Blob in R2; waiting for ingest worker | no |
| `running` | Worker claimed the job | no |
| `normalizing` | PDF/CSV/XLSX/text flatten in progress | no |
| `extracting` | chunk + embed + extract + classify | no |
| `reviewing` | Human review required (PII, low confidence, or dataset policy) | no |
| `succeeded` | Warehouse rows committed; published views eligible to refresh | yes |
| `duplicate` | Exact `content_hash` hit; no new document; pointer to existing `document_id` | yes |
| `rejected` | Policy/type/size/page-count; no warehouse document | yes |
| `failed` | Worker exception; `error_code` + `error` set; retryable if `retry_count < max_retries` | yes unless retried |
| `cancelled` | Operator cancelled before `extracting` completed | yes |

State machine:

```
accepted → queued → running → normalizing → extracting ┬→ succeeded
                         │                             ├→ reviewing → succeeded
                         │                             ├→ rejected
                         │                             └→ failed → (retry) queued
                         ├→ duplicate
                         ├→ rejected
                         └→ cancelled
```

Illegal transitions (must 409): `succeeded → running`, `duplicate → extracting`, `rejected → succeeded` without a new job. Re-ingest of the same bytes for the same dataset is `duplicate`, not a new succeeded job. Re-ingest with a **new extractor version** is a new job with `parent_job_id` and `reason=reextract`; it does not change `content_hash`.

Job persistence: table `ingest.jobs` (§3.2). The Collaborate HTTP envelope keeps today’s shape so `apps/landing/app/PublicApp.tsx` `CollaborateResult` stays valid:

```json
{
  "status": "ingested" | "duplicate" | "failed",
  "contentHash": "sha256:…",
  "jobId": "uuid",
  "document": { "id": "uuid", "title": "…", "classification": { "label": "budget", "confidence": 0.89 }, "extractions": [] },
  "possibleDuplicates": [{ "documentId": "uuid", "title": "…", "score": 0.81 }]
}
```

Map warehouse job status → Collaborate `status`: `duplicate` → `duplicate`; `succeeded` / `reviewing` → `ingested`; `failed` / `rejected` / `cancelled` → `failed`. `reviewing` is still `ingested` for the citizen (we accepted the file); the document is not in `published` until review clears.

### 1.3 Quotas

Quotas are enforced **before** Superparser spends embeddings or langextract. AS-IS already does a cheap hash lookup in `collaborate()` (`pipeline.py` lines 192–200) and a worker-side IP limiter.

#### 1.3.1 AS-IS numbers (keep as the public floor)

| Gate | Location | Limit |
|---|---|---|
| File size | `collaborate.ts` `MAX_UPLOAD_BYTES = 10 * 1024 * 1024` and `PublicApp.tsx` `COLLABORATE_MAX_BYTES` | 10 MiB |
| IP rate | `collaborate.ts` `RATE_LIMIT_MAX = 12`, `RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000`, KV key `collab-rl:{ip}` | 12 POSTs / 10 min / IP |
| MIME / extension | `ALLOWED_CONTENT_TYPES` / `ALLOWED_EXTENSIONS` | pdf, csv, xlsx, xls, txt, md, json |
| PDF size / pages | `normalization.py` `MAX_PDF_BYTES = 50 MiB`, `MAX_PDF_PAGES = 1000` | operator/Drive path only (Collaborate never reaches 50 MiB) |
| Empty file | worker 400, Superparser 422 | reject |
| Shared secret | `SUPERPARSER_SHARED_SECRET` bearer (`api.py` `require_shared_secret`) | Superparser not publicly writable when set |

`SUPERPARSER_URL` empty → 503 `{ error, code: "superparser_unconfigured" }`. That remains the correct undeployed behavior.

#### 1.3.2 TO-BE quota table

Quotas are stored in `ingest.quota_policies` and counted in `ingest.quota_counters`. Missing policy → platform defaults below. Company-scoped (control-plane invariant).

| `actor_class` | Max bytes / file | Rate | Window | Monthly bytes | Monthly jobs | Notes |
|---|---|---|---|---|---|---|
| `citizen_anon` | 10 MiB | 12 | 10 min / IP | 100 MiB | 40 | today’s Collaborate |
| `citizen_account` | 10 MiB | 30 | 10 min / `user_id` | 500 MiB | 200 | signed-in Collaborate (`actor.type === "board"` attribution in `collaborate.ts`) |
| `government` | 50 MiB | 60 | 10 min / `user_id` | 10 GiB | 2 000 | institution operators; PDF page cap 1000 still applies |
| `board` | 50 MiB | 120 | 10 min / company | company `budget_monthly_cents` | unlimited except budget | control-plane board |
| `agent` | 50 MiB | 60 | 10 min / agent | billed via `cost_events` | unlimited except budget | heartbeat / MCP |
| `etl` | n/a | n/a | n/a | n/a | n/a | D1 mirror; not a file ingest |

Hard vs soft:

- File size, MIME, PDF pages, IP/user rate → **hard** (413 / 415 / 429).
- Monthly bytes/jobs for `citizen_*` → **hard** (429 `quota_exhausted`).
- Monthly bytes for `government` / `board` / `agent` → **soft alert** at 80% of policy, **hard stop** at 100%, matching control-plane budget hard-stop (`doc/SPEC-implementation.md` budget enforcement). Ingest cost events are written to D1 `cost_events` with `provider='superparser'`, `model=<extractor_version.model>`, `billing_type='ingest'`.

429 bodies:

```json
{ "error": "Too many uploads from this connection. Please try again later.", "code": "rate_limited" }
{ "error": "Monthly ingest quota exhausted for this institution.", "code": "quota_exhausted", "resetAt": "2026-09-01T00:00:00Z" }
```

Retry-After is set on IP rate limits (already in `collaborate.ts`). Monthly quota includes `resetAt` (UTC month boundary, same as `budget_monthly_cents`).

### 1.4 Content-hash dedup

AS-IS:

- Hash: `"sha256:" + hashlib.sha256(data).hexdigest()` (`pipeline.py` `content_hash`).
- Column: `superparser.documents.content_hash` (`migrations/002_collaborate_content_hash.sql`).
- Lookup: `(company_id, content_hash)` index; `find_document_by_hash` returns the **oldest** row.
- Collaborate exact re-upload returns `{ status: "duplicate" }` and does **not** re-embed (`test_collaborate.py` `test_collaborate_recognises_an_exact_reupload_without_reprocessing`).
- Near-duplicates (not byte-identical) still ingest and return `possibleDuplicates` via embedding search (`find_similar_documents`, first 1000 chars). Advisory only.

TO-BE:

1. Hash **raw bytes** as received, before normalize. Same `sha256:` prefix so existing `public_contributions.content_hash` rows remain joinable.
2. Dedup scope is `(dataset_id, content_hash)`, not a global hash. The same ordinance PDF may legally exist in two institutions’ private datasets.
3. Platform Collaborate without an institution targets dataset `ds_public_contributions` (seed). Hash scope is that dataset — same as today’s `company_id = "public-contributions"`.
4. Exact hit → job `duplicate`, `existing_document_id` set, **zero** extractor cost, **zero** new chunk/fact rows. If the caller is a signed-in citizen, still insert `oltp.public_contributions` (and D1 `public_contributions`) pointing at the existing document — today’s attribution behavior.
5. Near-duplicate advisory stays, but the embedding search runs **inside the warehouse** (or Superparser as a private RPC). It is not a public `/v1/search`.
6. Hash is stored on both `ingest.blobs.sha256` (no prefix, 64 hex chars) and `warehouse.documents.content_hash` (with `sha256:` prefix) so R2 object keys and Collaborate JSON stay compatible.

R2 object key:

```
ingest/{company_id}/{yyyy}/{mm}/{sha256}/{original_filename}
```

`assets.sha256` in D1 (`packages/db-cloudflare/src/schema/assets.ts`) is the same 64-hex form without prefix. Warehouse blobs may share the `ciutatis-assets` bucket with a distinct key prefix, or use `tenant_instances.tenant_r2_bucket_name` for tenant-isolated government uploads.

### 1.5 What Superparser must stop being

After cutover, the following Superparser routes are **not** the product query surface:

| Route | AS-IS | TO-BE |
|---|---|---|
| `POST /v1/ingestions` | public-ish ingest | **internal** ingest worker API (shared secret required in all envs) |
| `POST /v1/collaborate` | citizen ingest + dedup | **internal**; only `workers/api` calls it |
| `GET /v1/ingestions/{id}` | job poll | internal job poll, or replaced by `ingest.jobs` via workers/api |
| `GET /v1/documents` | list | **removed** from product; SQL `published.documents` |
| `GET /v1/documents/{id}` | full flat_text + chunks + extractions | **removed**; leaks unredacted text |
| `GET /v1/documents/{id}/extractions` | extractions | **removed**; `published.facts` |
| `POST /v1/search` | pgvector cosine | **removed**; not a query API |
| `POST /v1/mcp/tools/search_documents` | MCP search | **removed** or restricted to ingest-debug |
| `POST /v1/mcp/tools/ingest_document` | MCP ingest | keep as ingest trigger |
| `POST /v1/ciutatis/heartbeat` | agent ingest | keep as ingest trigger |

The Superparser portal (`apps/superparser-portal/src/app.js`) calls `/v1/ingestions` and `/v1/search` against a demo-company. Fold those screens into Next: operator ingest on the institution board, citizen ingest on `/collaborate` (already in `PublicApp.tsx`), scrutiny SQL on the Dune-like UI against `published`.

---

## 2. Parse pipeline

### 2.1 Steps (normative order)

AS-IS order in `IngestionPipeline.ingest_upload` (`pipeline.py`):

1. `normalize_source` → `NormalizedSource` (`kind` pdf / spreadsheet / text / rejected)
2. `save_document` with `flat_text` + `content_hash`
3. `chunk_text` (1200 chars, 120 overlap, newline boundary) (`chunking.py`)
4. `gemini_gateway.embed_texts` — Gemini `models/text-embedding-004` 768-d, or deterministic 16-d hash fallback (`gemini_gateway.py`)
5. `run_extraction` — langextract if importable, else regex `govops_v1` fallback (`extraction.py`)
6. `classify_document` — keyword scores → `budget | procurement | ordinance | public_health | infrastructure | general_government` (`classification.py`)
7. job `succeeded`

TO-BE inserts PII, review, entity resolution, warehouse commit, and optional Parquet. Superparser still runs steps 1–7; the warehouse writer runs 8–12.

| Step | Owner | Input | Output | Failure |
|---|---|---|---|---|
| 0. Accept | `workers/api` | multipart/JSON | `ingest.jobs` `accepted` + R2 put | 400/413/415/429/503 |
| 1. Dedup | ingest worker | raw bytes | `duplicate` or continue | none (lookup miss is success) |
| 2. Normalize | ingest worker | bytes | `flat_text`, `kind`, metadata (`byteSize`, `pageCount`, `rowCount`, `sheetCount`) | `rejected` (`pdf_too_large`, `pdf_too_many_pages`, `xlsx_parser_unavailable`, `source_rejected`) |
| 3. PII scan | ingest worker | `flat_text` | `flat_text_redacted`, `pii_detected`, `warehouse.pii_findings` | never fails closed: on scanner error, treat as `pii_detected=true` and force `reviewing` |
| 4. Chunk | ingest worker | redacted text for public datasets; raw text for private | `warehouse.chunks` | empty text → document with 0 chunks, classification `empty`, job `succeeded` |
| 5. Embed | ingest worker | chunk texts | `embedding vector(768)` on chunks (**not** in `published`) | retry 3× (`GeminiGateway.max_retries`); then `failed` `embedding_failed` |
| 6. Extract | ingest worker | text + `extractor_versions` row | `warehouse.facts` draft | ungrounded spans dropped (`filter_grounded_extractions`); zero facts is allowed |
| 7. Classify | ingest worker | text | `warehouse.classifications` | always produces one label (fallback `general_government`) |
| 8. Entity resolve | warehouse writer | facts + oltp mirrors | `warehouse.entities`, `warehouse.entity_links` | unresolved facts stay with `resolution_status='unresolved'` |
| 9. Review gate | warehouse writer | policy | `reviewing` or skip | see §2.3 |
| 10. Commit | warehouse writer | draft rows | visible in `warehouse.*`; `published.*` only if visibility + review allow | transaction abort → `failed` |
| 11. Notify | warehouse writer | job | control-plane comment/document (existing heartbeat behavior); activity log | best-effort |
| 12. Parquet (optional) | warehouse writer | dataset flag `parquet_export=true` | R2 parquet objects + `ingest.parquet_exports` | job still `succeeded`; export `failed` is a follow-up job |

Chunk identity: `(document_id, ordinal)` unique. `source_span` is `{start, end}` **into the stored `flat_text` of that document** (the redacted text if the dataset is `government` or `public`; the private text if `private`). Facts’ spans must be subsets of a chunk span or they are dropped (same grounding rule as `filter_grounded_extractions`).

Token estimate stays `max(1, len(text) // 4)` unless an extractor version supplies a real tokenizer; the column is advisory.

### 2.2 Extractor versioning

AS-IS is a single frozen schema:

```python
ExtractionSchema(name="govops_v1", fields=("agency", "money", "date", "ordinance", "program", "person", "place"))
```

Fallback regexes only fire for `money`, `date`, `ordinance`, `agency` (`extraction.py` `_fallback_govops_extractions`). `program`, `person`, `place` exist in the schema name but have **no** deterministic fallback. Langextract is optional (`import langextract`) and ungrounded hits are discarded.

TO-BE: every extraction run pins an `extractor_versions` row. Re-running a document with a new version creates new fact rows with `supersedes_fact_id` and does not silently rewrite history.

| Column | Rule |
|---|---|
| `schema_name` | `govops` (family) |
| `schema_version` | integer, start at **1** (= today’s `govops_v1`) |
| `semver` | `'1.0.0'` for the regex+langextract extractor shipped in-tree |
| `fact_types` | `money,date,ordinance,person,org,place,program` — **`agency` is renamed `org`** at v1→warehouse load. Legacy `type='agency'` maps to `org` with `attributes.legacy_type='agency'` |
| `provider` | `langextract` \| `deterministic_fallback` \| `human` |
| `model` | e.g. `models/text-embedding-004` for embed; langextract model id when used; `regex` for fallback |
| `prompt_hash` | sha256 of the langextract `prompt_description` string (today: `"Extract government operations facts. … Keep source grounding."`) |
| `code_ref` | git sha of the worker image |
| `is_default` | exactly one default per `schema_name` |

Warehouse load of historical Superparser `extractions.type='agency'` rewrites to `org`. New extractors must not emit `agency`.

Version bump rules:

- New fact type or changed span semantics → new `schema_version`.
- Prompt-only change → new row, same `schema_version`, new `prompt_hash`.
- Regex tweak in `_fallback_govops_extractions` → new row, `provider='deterministic_fallback'`.

A document may have facts from multiple extractor versions. `published.facts` shows the **latest approved** version per `(document_id, fact_type, normalized_value, source_span)` unless the user queries `warehouse.facts` (not default).

### 2.3 Human review

AS-IS: none. Classification confidence is a heuristic `min(0.98, 0.45 + best_score * 0.16)` and is stored, never gated.

TO-BE review is mandatory when any of these is true:

1. `pii_detected = true` **and** dataset `visibility IN ('government','public')`.
2. Classification `confidence < 0.61` (below two keyword hits in the current heuristic) **and** visibility `public`.
3. Any fact with `attributes.confidence = 'fallback'` (regex) **and** visibility `public`.
4. Dataset `require_review = true` (default for `public` datasets).
5. Entity linker proposed a `public_request` or `geo_entity` link with `confidence < 0.80`.

Review queue: `warehouse.review_items`. Reviewer is a board user or institution member (control-plane auth). Agents may **propose** edits; they cannot approve public visibility (approval-gate invariant).

Review actions:

| `decision` | Effect |
|---|---|
| `approve` | job `succeeded`; facts `review_status='approved'`; eligible for `published` |
| `approve_with_edits` | reviewer patches `normalized_value` / drops facts; `reviewer_user_id` recorded; extractor `provider` remains original; `human_edited=true` |
| `reject_document` | job `rejected`; document `visibility` forced `private`; not in `published` |
| `redact_and_approve` | additional manual redaction spans written to `pii_findings`; then approve |

SLA: citizen Collaborate `reviewing` jobs must not block the HTTP response (today’s pipeline is synchronous). TO-BE Collaborate returns after step 7 with `status: ingested` and `reviewStatus: pending|cleared`. The Next UI already shows classification + extractions from the JSON envelope; it must also show “pending review” when `reviewStatus=pending`.

### 2.4 PII redaction

Canonical implementation: `redactPublicText` in `packages/shared/src/public-portal.ts`. Public requests already use it in `workers/api/src/lib/public-portal.ts` (`createPublicRequest`, comment path) and `server/src/services/public-portal.ts`. The warehouse **must call the same function** (port to Python in Superparser or run a shared WASM/JS worker). Do not invent a second pattern list.

Patterns (verbatim from `public-portal.ts`):

| Pattern | Replacement |
|---|---|
| email `\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b` | `[email removed]` |
| phone `(?:(?:\+|00)\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?){2,5}\d{3,4}\b` | `[phone removed]` |
| URL `\bhttps?:\/\/[^\s]+` | `[link removed]` |
| street address `\d{1,5} … street\|st\|avenue\|ave\|road\|rd\|boulevard\|blvd\|lane\|ln\|drive\|dr\|calle\|avenida\|av\|pasaje` | `[address removed]` |
| self-id `(my name is\|i am\|i'm\|me llamo\|soy) + Name` | `[identity removed]` |
| long number `\b\d{7,}\b` | `[number removed]` |

Then `collapseWhitespace`. Return `{ text, piiDetected }`.

Warehouse rules:

- `warehouse.documents.flat_text` = **unredacted** (private). Role `warehouse_admin` / dataset `private` readers only.
- `warehouse.documents.flat_text_redacted` = `redactPublicText(flat_text).text`.
- `warehouse.documents.pii_detected` = boolean, same meaning as `public_requests.pii_detected`.
- `published.documents.body` = `flat_text_redacted` always. Never the raw column.
- `published.facts.text` = redacted. If redaction would destroy a money/date/ordinance span, keep the span only when the matched text itself is not PII (a dollar amount is not a long-number hit because of `\d{7,}`; ordinance ids usually are not). If a fact span overlaps a redaction replacement, drop the fact from `published` and keep it in `warehouse.facts` with `publishable=false`.
- Drive `owners[].email` and `last_modifier.email` stay in `warehouse.documents.metadata_json` and are stripped from `published.documents.metadata`.
- `oltp.public_requests.contact_email` / `contact_name` / `recovery_token_hash` are **never** in `published`.
- `pii_findings` stores each match: `pattern_name`, `start`, `end`, `replacement`. Used for review UI highlighting.

Citizen Collaborate files are treated like public-request bodies: scan before publish. Operator private datasets may skip publishing but still scan so promotion to `government`/`public` later is safe.

---

## 3. Full logical SQL schema

Postgres 16+. Required extensions: `pgcrypto`, `vector` (pgvector, 768-d, same as `001_superparser_schema.sql`). Optional: `pg_cron` for ETL ticks.

Schemas:

| Schema | Privilege | Contents |
|---|---|---|
| `ingest` | ingest worker + board | jobs, blobs, quotas, parquet export ledger |
| `warehouse` | ingest worker, reviewers, board | system of record |
| `oltp` | ETL writer; read for join | mirrored D1 |
| `published` | **SQL users by default** | views only (plus a catalog table in `warehouse`) |
| `legacy_superparser` | migration | optional FDW / copy of `superparser.*` during cutover |

Default for the SQL console: `SET search_path TO published, oltp, pg_catalog;`. `warehouse` and `ingest` are not on the path. Grants: `public` visibility views to `sql_public`; `government` to `sql_government`; `private` not granted to SQL users at all (board UI uses the application API).

All warehouse-native primary keys are UUID. All mirrored D1 primary keys are `text` (D1/Drizzle text UUIDs). Do not recast D1 ids to `uuid` — some geo ids are `ar:060798`, not UUIDs.

Timestamps are `timestamptz`. Money is integer **cents** plus ISO currency, never float. Booleans are `boolean`.

### 3.1 `ingest.blobs`

```sql
CREATE TABLE ingest.blobs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        text NOT NULL,                 -- control-plane companies.id (D1 text uuid)
  dataset_id        uuid NOT NULL,
  sha256            text NOT NULL CHECK (sha256 ~ '^[0-9a-f]{64}$'),
  content_hash      text NOT NULL CHECK (content_hash = 'sha256:' || sha256),
  r2_bucket         text NOT NULL,
  r2_key            text NOT NULL,
  byte_size         bigint NOT NULL CHECK (byte_size >= 0),
  content_type      text NOT NULL,
  original_filename text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (dataset_id, sha256),
  UNIQUE (r2_bucket, r2_key)
);
```

### 3.2 `ingest.jobs`

```sql
CREATE TABLE ingest.jobs (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id            text NOT NULL,
  dataset_id            uuid NOT NULL,
  blob_id               uuid REFERENCES ingest.blobs(id),
  parent_job_id         uuid REFERENCES ingest.jobs(id),
  status                text NOT NULL CHECK (status IN (
                          'accepted','queued','running','normalizing','extracting',
                          'reviewing','succeeded','duplicate','rejected','failed','cancelled'
                        )),
  source_kind           text NOT NULL CHECK (source_kind IN (
                          'upload','collaborate','drive','inline_text','url','oltp_export'
                        )),
  source_ref            text,
  actor_class           text NOT NULL CHECK (actor_class IN (
                          'citizen_anon','citizen_account','government','board','agent','etl'
                        )),
  actor_user_id         text,
  actor_agent_id        text,
  actor_ip_hash         text,                      -- sha256 of IP; never store raw IP in warehouse
  existing_document_id  uuid,                      -- set on duplicate
  extractor_version_id  uuid,
  error_code            text,
  error                 text,
  retry_count           int NOT NULL DEFAULT 0,
  max_retries           int NOT NULL DEFAULT 3,
  started_at            timestamptz,
  finished_at           timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ingest_jobs_company_status_idx ON ingest.jobs (company_id, status);
CREATE INDEX ingest_jobs_dataset_created_idx ON ingest.jobs (dataset_id, created_at DESC);
```

Maps from `superparser.ingestion_jobs` (`id, company_id, status, source_type, source_ref, error, created_at, updated_at`).

### 3.3 `ingest.quota_policies` / `ingest.quota_counters`

```sql
CREATE TABLE ingest.quota_policies (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      text,                            -- NULL = platform default
  actor_class     text NOT NULL,
  max_file_bytes  bigint NOT NULL,
  rate_max        int NOT NULL,
  rate_window_ms  int NOT NULL,
  monthly_bytes   bigint,                          -- NULL = unlimited
  monthly_jobs    int,
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, actor_class)
);

CREATE TABLE ingest.quota_counters (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      text NOT NULL,
  actor_class     text NOT NULL,
  actor_key       text NOT NULL,                   -- ip_hash or user_id or agent_id
  window_kind     text NOT NULL CHECK (window_kind IN ('rate','month')),
  window_start    timestamptz NOT NULL,
  bytes_used      bigint NOT NULL DEFAULT 0,
  jobs_used       int NOT NULL DEFAULT 0,
  UNIQUE (company_id, actor_class, actor_key, window_kind, window_start)
);
```

Citizen IP rate may continue to live in KV (`collab-rl:{ip}`) as the hot path; `quota_counters` is the monthly source of truth and the government/board path.

### 3.4 `ingest.parquet_exports`

```sql
CREATE TABLE ingest.parquet_exports (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id      uuid NOT NULL,
  table_name      text NOT NULL CHECK (table_name IN (
                    'documents','chunks','facts','entities','entity_links','classifications'
                  )),
  partition_date  date NOT NULL,
  r2_bucket       text NOT NULL,
  r2_prefix       text NOT NULL,                   -- see §3.20 path layout
  row_count       bigint NOT NULL,
  byte_size       bigint NOT NULL,
  status          text NOT NULL CHECK (status IN ('running','succeeded','failed')),
  error           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (dataset_id, table_name, partition_date, r2_prefix)
);
```

Parquet is **optional** and never the system of record. It exists for scans that would otherwise seq-scan `warehouse.facts` (budget-line dumps, multi-year ordinances). Postgres remains authoritative; Parquet is a derived snapshot of `published`-eligible columns only (redacted).

R2 layout:

```
r2://{bucket}/warehouse/{env}/dataset_id={uuid}/table={name}/dt={yyyy-mm-dd}/part-{nnnn}.parquet
```

### 3.5 `warehouse.datasets`

```sql
CREATE TABLE warehouse.datasets (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id          text NOT NULL,               -- owning institution (D1 companies.id)
  slug                text NOT NULL,               -- stable, url-safe, unique per company
  title               text NOT NULL,
  description         text,
  visibility          text NOT NULL CHECK (visibility IN ('private','government','public')),
  require_review      boolean NOT NULL DEFAULT true,
  parquet_export      boolean NOT NULL DEFAULT false,
  default_extractor_version_id uuid,
  geo_entity_id       text,                        -- default jurisdiction (oltp.geo_entities.id)
  source_kind_default text,
  created_by_user_id  text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, slug)
);

CREATE INDEX datasets_visibility_idx ON warehouse.datasets (visibility);
CREATE INDEX datasets_geo_idx ON warehouse.datasets (geo_entity_id);
```

Visibility promotion is **one-way without a board approval**: `private → government` and `government → public` write `warehouse.dataset_visibility_events` and require a control-plane approval row (same approval-gate invariant as hires). Demotion `public → government` or `government → private` is allowed to the board and immediately rebuilds `published` views (rows disappear from public SQL).

Seed datasets:

| slug | company_id | visibility | purpose |
|---|---|---|---|
| `public-contributions` | platform institution (today’s literal `"public-contributions"` until a real company row exists) | `government` until review, then `public` | Collaborate |
| `govops-{issue_prefix}` | each institution | `private` | operator uploads / Drive / heartbeat |

### 3.6 `warehouse.documents`

```sql
CREATE TABLE warehouse.documents (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id            text NOT NULL,
  dataset_id            uuid NOT NULL REFERENCES warehouse.datasets(id),
  job_id                uuid NOT NULL REFERENCES ingest.jobs(id),
  blob_id               uuid REFERENCES ingest.blobs(id),
  title                 text NOT NULL,
  source_kind           text NOT NULL,
  source_ref            text,
  content_type          text NOT NULL,
  content_hash          text NOT NULL,             -- 'sha256:' || hex
  kind                  text NOT NULL CHECK (kind IN ('pdf','spreadsheet','text','rejected')),
  flat_text             text NOT NULL,             -- UNREDACTED; not in published
  flat_text_redacted    text NOT NULL,
  pii_detected          boolean NOT NULL DEFAULT false,
  metadata_json         jsonb NOT NULL DEFAULT '{}'::jsonb,
  page_count            int,
  row_count             int,
  sheet_count           int,
  byte_size             bigint,
  language              text,                      -- BCP-47; nullable
  visibility            text NOT NULL CHECK (visibility IN ('private','government','public')),
  publishable           boolean NOT NULL DEFAULT false,  -- true after review + visibility
  created_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (dataset_id, content_hash)
);

CREATE INDEX documents_company_created_idx ON warehouse.documents (company_id, created_at DESC);
CREATE INDEX documents_metadata_gin_idx ON warehouse.documents USING gin (metadata_json);
CREATE INDEX documents_dataset_vis_idx ON warehouse.documents (dataset_id, visibility, publishable);
```

Maps from `superparser.documents`. `kind` is today’s `source_type` after normalize (`pdf|spreadsheet|text`). Drive originals keep `source_kind='drive'` on the job and `kind` as the normalized form.

`metadata_json` keys (locked):

```json
{
  "byteSize": 12345,
  "pageCount": 12,
  "rowCount": 80,
  "sheetCount": 2,
  "format": "xlsx",
  "modelLimit": "50MB/1000 pages",
  "drive": {
    "source_id": "…",
    "title": "…",
    "mime_type": "…",
    "web_view_link": "…",
    "created_time": "…",
    "modified_time": "…",
    "revisionCount": 3
  },
  "ciutatis": { "issueId": "…", "runId": "…" }
}
```

Published metadata drops `drive.owners`, `drive.last_modifier`, and any email/phone keys.

### 3.7 `warehouse.chunks`

```sql
CREATE TABLE warehouse.chunks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      text NOT NULL,
  document_id     uuid NOT NULL REFERENCES warehouse.documents(id) ON DELETE CASCADE,
  ordinal         int NOT NULL CHECK (ordinal >= 0),
  text            text NOT NULL,                   -- same redaction as the document body used for spans
  token_estimate  int NOT NULL,
  source_span     jsonb NOT NULL,                  -- {"start":int,"end":int}
  embedding       vector(768),                     -- NULL if embed failed and job still reviewing
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (document_id, ordinal)
);

CREATE INDEX chunks_embedding_hnsw_idx
  ON warehouse.chunks USING hnsw (embedding vector_cosine_ops);
```

Maps from `superparser.document_chunks`. Embeddings are **warehouse-only**. `published.chunks` exposes `id, document_id, ordinal, text, source_span, token_estimate` — no vector.

### 3.8 `warehouse.extractor_versions`

```sql
CREATE TABLE warehouse.extractor_versions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schema_name     text NOT NULL,                   -- 'govops'
  schema_version  int NOT NULL,                    -- 1 = govops_v1
  semver          text NOT NULL,
  fact_types      text[] NOT NULL,
  provider        text NOT NULL CHECK (provider IN (
                    'langextract','deterministic_fallback','human'
                  )),
  model           text NOT NULL,
  prompt_hash     text NOT NULL,
  code_ref        text,
  is_default      boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (schema_name, schema_version, provider, prompt_hash)
);
```

Seed row: `schema_name='govops'`, `schema_version=1`, `semver='1.0.0'`, `fact_types='{money,date,ordinance,person,org,place,program}'`, `provider='deterministic_fallback'`, `model='regex'`, `prompt_hash` of the current langextract prompt string, `is_default=true` until langextract is pinned in prod.

### 3.9 `warehouse.facts`

```sql
CREATE TABLE warehouse.facts (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id            text NOT NULL,
  dataset_id            uuid NOT NULL REFERENCES warehouse.datasets(id),
  document_id           uuid NOT NULL REFERENCES warehouse.documents(id) ON DELETE CASCADE,
  chunk_id              uuid REFERENCES warehouse.chunks(id) ON DELETE SET NULL,
  extractor_version_id  uuid NOT NULL REFERENCES warehouse.extractor_versions(id),
  fact_type             text NOT NULL CHECK (fact_type IN (
                          'money','date','ordinance','person','org','place','program'
                        )),
  text                  text NOT NULL,             -- grounded surface form
  text_redacted         text NOT NULL,
  source_span           jsonb NOT NULL,            -- {"start":int,"end":int} into documents.flat_text used for extract
  normalized_value      jsonb NOT NULL DEFAULT '{}'::jsonb,  -- type-specific, see §4
  attributes            jsonb NOT NULL DEFAULT '{}'::jsonb,  -- extractor extras; includes legacy_type
  confidence            real NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  grounding             text NOT NULL CHECK (grounding IN ('span','human','derived')),
  review_status         text NOT NULL DEFAULT 'pending' CHECK (review_status IN (
                          'pending','approved','rejected','edited'
                        )),
  human_edited          boolean NOT NULL DEFAULT false,
  publishable           boolean NOT NULL DEFAULT false,
  supersedes_fact_id    uuid REFERENCES warehouse.facts(id),
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX facts_company_type_idx ON warehouse.facts (company_id, fact_type);
CREATE INDEX facts_document_idx ON warehouse.facts (document_id);
CREATE INDEX facts_normalized_gin_idx ON warehouse.facts USING gin (normalized_value);
CREATE INDEX facts_attributes_gin_idx ON warehouse.facts USING gin (attributes);
CREATE INDEX facts_publishable_idx ON warehouse.facts (dataset_id, fact_type, publishable);
```

Maps from `superparser.extractions` (`type` → `fact_type`, `attributes_json` → `attributes`). `agency` → `org` on load.

`confidence`: langextract may supply a score; fallback regex stores `0.40` and `attributes.confidence='fallback'` (today’s string). Human-approved edits set `confidence=1` and `grounding='human'` only when the reviewer typed a new value; otherwise keep extractor confidence and set `human_edited=true`.

### 3.10 `warehouse.entities`

```sql
CREATE TABLE warehouse.entities (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        text NOT NULL,                 -- owning dataset's company; platform rows use platform company
  entity_kind       text NOT NULL CHECK (entity_kind IN (
                      'person','org','place','program','ordinance','geo','institution','public_request'
                    )),
  canonical_name    text NOT NULL,
  search_name       text NOT NULL,                 -- lowercased unaccented, same algorithm as geo_entities.search_name
  slug              text NOT NULL,
  attributes        jsonb NOT NULL DEFAULT '{}'::jsonb,
  geo_entity_id     text,                          -- oltp.geo_entities.id when kind in ('place','geo') or resolved
  institution_id    text,                          -- oltp.institutions.id (D1 companies.id)
  public_request_id text,                          -- oltp.public_requests.id
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, entity_kind, slug)
);

CREATE INDEX entities_kind_search_idx ON warehouse.entities (entity_kind, search_name);
CREATE INDEX entities_geo_idx ON warehouse.entities (geo_entity_id);
CREATE INDEX entities_institution_idx ON warehouse.entities (institution_id);
CREATE INDEX entities_public_request_idx ON warehouse.entities (public_request_id);
```

`entity_kind='geo'` is a warehouse pointer at a mirrored geo row (so facts can link to `ar:30` without duplicating topography). `entity_kind='institution'` and `'public_request'` likewise. Extracted people/orgs/places/programs get warehouse-native ids and **then** link out via `entity_links`.

### 3.11 `warehouse.entity_links`

```sql
CREATE TABLE warehouse.entity_links (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        text NOT NULL,
  entity_id         uuid NOT NULL REFERENCES warehouse.entities(id) ON DELETE CASCADE,
  target_kind       text NOT NULL CHECK (target_kind IN (
                      'geo_entity','institution','public_request','document','fact','entity'
                    )),
  target_id         text NOT NULL,                 -- text so D1 ids and uuids coexist
  fact_id           uuid REFERENCES warehouse.facts(id) ON DELETE SET NULL,
  document_id       uuid REFERENCES warehouse.documents(id) ON DELETE SET NULL,
  method            text NOT NULL CHECK (method IN (
                      'exact_id','slug','issue_identifier','geocode','name_match','reviewer','ingest_hint'
                    )),
  confidence        real NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  evidence          jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entity_id, target_kind, target_id, fact_id)
);

CREATE INDEX entity_links_target_idx ON warehouse.entity_links (target_kind, target_id);
CREATE INDEX entity_links_fact_idx ON warehouse.entity_links (fact_id);
```

Join strategy is §5. `evidence` examples: `{ "span": {"start":0,"end":12}, "matched": "City Council" }`, `{ "public_id": "ciu-12" }`, `{ "path_prefix": "/ar/municipio/060798-tandil" }`.

### 3.12 `warehouse.classifications`

```sql
CREATE TABLE warehouse.classifications (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      text NOT NULL,
  document_id     uuid NOT NULL REFERENCES warehouse.documents(id) ON DELETE CASCADE,
  extractor_version_id uuid REFERENCES warehouse.extractor_versions(id),
  label           text NOT NULL CHECK (label IN (
                    'budget','procurement','ordinance','public_health',
                    'infrastructure','general_government','empty'
                  )),
  confidence      real NOT NULL,
  rationale       text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX classifications_document_idx ON warehouse.classifications (document_id);
```

Maps from `superparser.classifications`. Multiple rows per document are allowed (reclassify); `published.classifications` is `DISTINCT ON (document_id) … ORDER BY created_at DESC`.

### 3.13 `warehouse.pii_findings` / `warehouse.review_items`

```sql
CREATE TABLE warehouse.pii_findings (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id     uuid NOT NULL REFERENCES warehouse.documents(id) ON DELETE CASCADE,
  pattern_name    text NOT NULL CHECK (pattern_name IN (
                    'email','phone','url','address','self_identification','long_number','manual'
                  )),
  start_pos       int NOT NULL,
  end_pos         int NOT NULL,
  replacement     text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE warehouse.review_items (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id              uuid NOT NULL REFERENCES ingest.jobs(id),
  document_id         uuid NOT NULL REFERENCES warehouse.documents(id),
  reason              text NOT NULL CHECK (reason IN (
                        'pii','low_confidence_class','fallback_facts','dataset_policy','weak_link'
                      )),
  status              text NOT NULL CHECK (status IN (
                        'pending','approved','approved_with_edits','rejected','redact_and_approve'
                      )),
  reviewer_user_id    text,
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  decided_at          timestamptz
);
```

### 3.14 `warehouse.published_views` (catalog)

SQL users do not `SELECT` this table by default; the **views it describes** live in schema `published`. The catalog is how the Dune-like UI lists datasets and how ETL rebuilds views after visibility changes.

```sql
CREATE TABLE warehouse.published_views (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dataset_id        uuid REFERENCES warehouse.datasets(id),  -- NULL = platform-wide view
  schema_name       text NOT NULL DEFAULT 'published',
  view_name         text NOT NULL,
  visibility        text NOT NULL CHECK (visibility IN ('government','public')),
  -- private is never a published view
  sql_definition    text NOT NULL,                 -- CREATE OR REPLACE VIEW … AS
  description       text NOT NULL,
  row_filter        text NOT NULL,                 -- human-readable: 'publishable AND visibility=public'
  refresh_mode      text NOT NULL CHECK (refresh_mode IN ('on_commit','nightly','manual')),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (schema_name, view_name)
);
```

Locked platform views (seed `sql_definition` below). Dataset-specific views may be added later; they cannot bypass these filters.

```sql
CREATE SCHEMA IF NOT EXISTS published;

CREATE OR REPLACE VIEW published.datasets AS
SELECT id, company_id, slug, title, description, visibility, geo_entity_id, created_at, updated_at
FROM warehouse.datasets
WHERE visibility IN ('government','public');

CREATE OR REPLACE VIEW published.documents AS
SELECT
  d.id, d.company_id, d.dataset_id, d.title, d.source_kind, d.source_ref,
  d.content_type, d.content_hash, d.kind, d.flat_text_redacted AS body,
  d.pii_detected, d.page_count, d.row_count, d.sheet_count, d.byte_size,
  d.language, d.visibility, d.created_at,
  (d.metadata_json - 'drive' || jsonb_build_object(
     'drive', COALESCE(d.metadata_json->'drive','{}'::jsonb)
              - 'owners' - 'last_modifier' - 'raw'
  )) AS metadata
FROM warehouse.documents d
WHERE d.publishable
  AND d.visibility IN ('government','public');

CREATE OR REPLACE VIEW published.chunks AS
SELECT c.id, c.document_id, c.ordinal, c.text, c.token_estimate, c.source_span, c.created_at
FROM warehouse.chunks c
JOIN warehouse.documents d ON d.id = c.document_id
WHERE d.publishable AND d.visibility IN ('government','public');

CREATE OR REPLACE VIEW published.facts AS
SELECT
  f.id, f.company_id, f.dataset_id, f.document_id, f.chunk_id,
  f.fact_type, f.text_redacted AS text, f.source_span, f.normalized_value,
  f.confidence, f.grounding, f.created_at
FROM warehouse.facts f
JOIN warehouse.documents d ON d.id = f.document_id
WHERE f.publishable
  AND f.review_status IN ('approved','edited')
  AND d.publishable
  AND d.visibility IN ('government','public');

CREATE OR REPLACE VIEW published.entities AS
SELECT id, company_id, entity_kind, canonical_name, search_name, slug,
       attributes, geo_entity_id, institution_id, public_request_id, created_at, updated_at
FROM warehouse.entities;

CREATE OR REPLACE VIEW published.entity_links AS
SELECT el.id, el.entity_id, el.target_kind, el.target_id, el.fact_id, el.document_id,
       el.method, el.confidence
FROM warehouse.entity_links el
LEFT JOIN warehouse.facts f ON f.id = el.fact_id
LEFT JOIN warehouse.documents d ON d.id = COALESCE(el.document_id, f.document_id)
WHERE el.target_kind IN ('geo_entity','institution','public_request','document','fact','entity')
  AND (d.id IS NULL OR (d.publishable AND d.visibility IN ('government','public')));

CREATE OR REPLACE VIEW published.classifications AS
SELECT DISTINCT ON (c.document_id)
  c.id, c.document_id, c.label, c.confidence, c.rationale, c.created_at
FROM warehouse.classifications c
JOIN warehouse.documents d ON d.id = c.document_id
WHERE d.publishable AND d.visibility IN ('government','public')
ORDER BY c.document_id, c.created_at DESC;

CREATE OR REPLACE VIEW published.usage_daily AS
SELECT * FROM warehouse.usage_daily;

CREATE OR REPLACE VIEW published.geo_entities AS
SELECT id, country_code, level, jurisdiction_type, name, search_name, slug,
       path_prefix, parent_id, province_id, departamento_id, lat, lon,
       osm_type, osm_id, category, source, updated_at
FROM oltp.geo_entities;
-- tenant_instance_id omitted (operational)

CREATE OR REPLACE VIEW published.institutions AS
SELECT id, name, slug, description, status, issue_prefix, brand_color, geo_entity_id, created_at
FROM oltp.institutions
WHERE status IN ('active','paused');

CREATE OR REPLACE VIEW published.public_requests AS
SELECT
  id, public_id, issue_id, company_id AS institution_id, institution_slug,
  category, location_label, public_title, public_summary, public_description,
  public_status, pii_detected, created_at, updated_at
FROM oltp.public_requests;
-- contact_name, contact_email, recovery_token_hash, owner_user_id, submission_mode omitted

CREATE OR REPLACE VIEW published.public_request_updates AS
SELECT id, public_request_id, kind, actor_label, body, created_at
FROM oltp.public_request_updates;
```

Government SQL role: same views plus a `published_government.documents` that includes `visibility='government'` rows the caller’s `company_id` may see (enforced in the application by wrapping SQL with `SET app.company_id` and a view predicate `company_id = current_setting('app.company_id') OR visibility='public'`). Public SQL role: `visibility='public'` only. Implement with two view sets or a single set plus row-level security:

```sql
ALTER VIEW published.documents SET (security_invoker = true);
-- RLS lives on warehouse.documents; published views are security invoker
ALTER TABLE warehouse.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY documents_public_sql ON warehouse.documents
  FOR SELECT TO sql_public
  USING (publishable AND visibility = 'public');
CREATE POLICY documents_gov_sql ON warehouse.documents
  FOR SELECT TO sql_government
  USING (publishable AND visibility IN ('government','public')
         AND (visibility = 'public' OR company_id = current_setting('app.company_id', true)));
```

**What SQL can see by default is `published.*`.** That sentence is the product rule. The Dune-like editor starts with `FROM facts` resolving to `published.facts`.

### 3.15 `warehouse.usage_daily`

Imported from the control plane (D1 `cost_events` + `finance_events` + ingest counters). Not computed from Superparser `search_queries`.

```sql
CREATE TABLE warehouse.usage_daily (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day                   date NOT NULL,             -- UTC
  company_id            text NOT NULL,
  provider              text NOT NULL,             -- cost_events.provider
  biller                text NOT NULL,
  billing_type          text NOT NULL,
  model                 text NOT NULL,
  input_tokens          bigint NOT NULL DEFAULT 0,
  cached_input_tokens   bigint NOT NULL DEFAULT 0,
  output_tokens         bigint NOT NULL DEFAULT 0,
  cost_cents            bigint NOT NULL DEFAULT 0,
  finance_debit_cents   bigint NOT NULL DEFAULT 0,
  finance_credit_cents  bigint NOT NULL DEFAULT 0,
  ingest_jobs           int NOT NULL DEFAULT 0,
  ingest_bytes          bigint NOT NULL DEFAULT 0,
  ingest_documents      int NOT NULL DEFAULT 0,
  source                text NOT NULL DEFAULT 'oltp_etl',
  imported_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE (day, company_id, provider, biller, billing_type, model)
);

CREATE INDEX usage_daily_company_day_idx ON warehouse.usage_daily (company_id, day DESC);
```

Grain is one row per UTC day per company per `(provider, biller, billing_type, model)`. Superparser ingest appears as `provider='superparser'`, `billing_type='ingest'`, `model=<extractor model or 'regex'>`. Control-plane inference stays `provider` as recorded on `cost_events` (`packages/db-cloudflare/src/schema/cost_events.ts`: `provider, biller, billing_type, model, input_tokens, cached_input_tokens, output_tokens, cost_cents, occurred_at`).

`published.usage_daily` is public **aggregates at institution grain** (no agent_id, no issue_id, no heartbeat_run_id). That is intentional: token spend of a public institution is a civic fact; per-agent traces stay in D1.

### 3.16 `warehouse.saved_queries`

```sql
CREATE TABLE warehouse.saved_queries (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        text,                          -- NULL = user-personal or platform gallery
  user_id           text NOT NULL,
  slug              text NOT NULL,
  title             text NOT NULL,
  description       text,
  sql_text          text NOT NULL,                 -- must read published.* only when visibility=public
  visibility        text NOT NULL CHECK (visibility IN ('private','government','public')),
  last_run_at       timestamptz,
  last_run_ms       int,
  last_error        text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, slug)
);
```

Execution API (not built) parses `sql_text`, rejects any identifier whose schema is not `published` (and `oltp` only for `sql_government` via the views above — actually oltp is not on the public path). This is the Dune saved-query analog.

### 3.17 `warehouse.dashboards` / `warehouse.tiles`

No Dune UI exists today (`ScrutinyPage.tsx` is static “Coming soon”). Schema is locked so the UI can land without a second migration.

```sql
CREATE TABLE warehouse.dashboards (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        text,
  user_id           text NOT NULL,
  slug              text NOT NULL,
  title             text NOT NULL,
  description       text,
  visibility        text NOT NULL CHECK (visibility IN ('private','government','public')),
  layout_json       jsonb NOT NULL DEFAULT '{"cols":12,"rowHeight":80}'::jsonb,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, slug)
);

CREATE TABLE warehouse.tiles (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_id      uuid NOT NULL REFERENCES warehouse.dashboards(id) ON DELETE CASCADE,
  saved_query_id    uuid REFERENCES warehouse.saved_queries(id),
  title             text NOT NULL,
  tile_kind         text NOT NULL CHECK (tile_kind IN (
                      'table','timeseries','bar','pie','stat','map','markdown'
                    )),
  -- grid
  x                 int NOT NULL DEFAULT 0,
  y                 int NOT NULL DEFAULT 0,
  w                 int NOT NULL DEFAULT 6,
  h                 int NOT NULL DEFAULT 4,
  -- viz
  spec_json         jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- map tiles join published.geo_entities via spec_json.geoIdColumn
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX tiles_dashboard_idx ON warehouse.tiles (dashboard_id);
```

`spec_json` locked keys by `tile_kind`:

| kind | spec_json |
|---|---|
| `table` | `{ "columns": ["day","cost_cents"] }` |
| `timeseries` | `{ "x": "day", "y": "cost_cents", "series": "provider" }` |
| `bar` | `{ "x": "label", "y": "amount_cents" }` |
| `pie` | `{ "label": "category", "value": "n" }` |
| `stat` | `{ "column": "cost_cents", "agg": "sum", "format": "usd_cents" }` |
| `map` | `{ "geoIdColumn": "geo_entity_id", "valueColumn": "amount_cents", "join": "published.geo_entities" }` |
| `markdown` | `{ "body": "…" }` (redactPublicText applied if visibility public) |

### 3.18 OLTP mirror tables

Mirror **IDs and join columns**, not the entire control plane. Writes only from ETL (§6).

```sql
CREATE TABLE oltp.geo_entities (
  id                  text PRIMARY KEY,            -- 'ar:060798' | 'ar:loc:30070030' | 'ar:30'
  country_code        text NOT NULL,
  level               text NOT NULL,               -- pais | provincia | departamento | municipio | localidad
  jurisdiction_type   text NOT NULL,
  name                text NOT NULL,
  search_name         text NOT NULL,
  slug                text NOT NULL,
  path_prefix         text NOT NULL,
  parent_id           text,
  province_id         text,
  departamento_id     text,
  lat                 double precision,
  lon                 double precision,
  osm_type            text,
  osm_id              text,
  tenant_instance_id  text,                        -- omitted from published
  category            text,
  source              text NOT NULL DEFAULT 'georef',
  updated_at          timestamptz NOT NULL,
  mirrored_at         timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX oltp_geo_path_prefix_idx ON oltp.geo_entities (path_prefix);
CREATE INDEX oltp_geo_search_idx ON oltp.geo_entities (country_code, search_name);
CREATE INDEX oltp_geo_parent_idx ON oltp.geo_entities (parent_id);

CREATE TABLE oltp.institutions (
  id              text PRIMARY KEY,                -- D1 companies.id
  name            text NOT NULL,
  slug            text NOT NULL,                   -- buildInstitutionPortalSlug(name, issue_prefix)
  description     text,
  status          text NOT NULL,
  issue_prefix    text NOT NULL,
  brand_color     text,
  geo_entity_id   text,                            -- from tenant_instances.geo_id when claimed
  created_at      timestamptz NOT NULL,
  updated_at      timestamptz NOT NULL,
  mirrored_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE oltp.public_requests (
  id                  text PRIMARY KEY,
  issue_id            text NOT NULL,
  company_id          text NOT NULL,
  public_id           text NOT NULL,               -- createPublicRequestId(identifier, issueId) → lowercased
  institution_slug    text NOT NULL,
  submission_mode     text NOT NULL,               -- not published
  owner_user_id       text,                        -- not published
  contact_name        text,                        -- not published
  contact_email       text,                        -- not published
  category            text NOT NULL,               -- PUBLIC_REQUEST_CATEGORIES
  location_label      text,
  public_title        text NOT NULL,
  public_summary      text NOT NULL,
  public_description  text NOT NULL,               -- already redacted in OLTP
  public_status       text NOT NULL,
  pii_detected        boolean NOT NULL,
  created_at          timestamptz NOT NULL,
  updated_at          timestamptz NOT NULL,
  mirrored_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (public_id),
  UNIQUE (issue_id)
);

CREATE TABLE oltp.public_request_updates (
  id                  text PRIMARY KEY,
  public_request_id   text NOT NULL,
  issue_id            text NOT NULL,
  company_id          text NOT NULL,
  kind                text NOT NULL,               -- system | citizen_follow_up | status_change
  actor_label         text NOT NULL,
  body                text NOT NULL,               -- already redacted in OLTP
  created_at          timestamptz NOT NULL,
  mirrored_at         timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE oltp.public_contributions (
  id                    text PRIMARY KEY,
  user_id               text NOT NULL,             -- not published
  content_hash          text NOT NULL,             -- 'sha256:' || hex
  filename              text NOT NULL,
  content_type          text,
  status                text NOT NULL,             -- duplicate | ingested
  document_id           text,                      -- warehouse.documents.id as text
  classification_label  text,
  created_at            timestamptz NOT NULL,
  mirrored_at           timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE oltp.cost_events_daily_src (
  -- staging for usage_daily; not a 1:1 copy of every cost_event
  day                   date NOT NULL,
  company_id            text NOT NULL,
  provider              text NOT NULL,
  biller                text NOT NULL,
  billing_type          text NOT NULL,
  model                 text NOT NULL,
  input_tokens          bigint NOT NULL,
  cached_input_tokens   bigint NOT NULL,
  output_tokens         bigint NOT NULL,
  cost_cents            bigint NOT NULL,
  PRIMARY KEY (day, company_id, provider, biller, billing_type, model)
);
```

Column sources:

- `geo_entities`: `packages/db-cloudflare/src/schema/geo_entities.ts` and `migrations/0007_geo_entities.sql` (plus `departamento_id` on the Drizzle model / later seeds).
- `public_requests`: `packages/db-cloudflare/src/schema/public_requests.ts`, `migrations/0003_public_portal.sql`.
- `public_contributions`: `packages/db-cloudflare/src/schema/public_contributions.ts`, `migrations/0005_public_contributions.sql`.
- `institutions`: D1 table name `companies` (`packages/db-cloudflare/src/schema/institutions.ts`); slug is **derived**, not stored (`buildInstitutionPortalSlug` in `packages/shared/src/public-portal.ts`).
- `cost_events`: `packages/db-cloudflare/src/schema/cost_events.ts`.

### 3.19 `warehouse.source_activity`

Keep Drive revision/activity breadcrumbs that Superparser already modeled (`superparser.source_activity` in `001_superparser_schema.sql`) but never wrote from Python (no insert path in `postgres.py`). TO-BE: Drive fetch writes one row per revision.

```sql
CREATE TABLE warehouse.source_activity (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        text NOT NULL,
  document_id       uuid REFERENCES warehouse.documents(id) ON DELETE CASCADE,
  source_provider   text NOT NULL,                 -- 'google_drive'
  source_id         text NOT NULL,
  activity_json     jsonb NOT NULL,
  occurred_at       timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now()
);
```

Not published (may contain emails).

### 3.20 Column map: Superparser → warehouse

| Superparser (AS-IS) | Warehouse (TO-BE) |
|---|---|
| `ingestion_jobs` | `ingest.jobs` |
| `documents` | `warehouse.documents` + `ingest.blobs` |
| `documents.content_hash` | same string; unique on `(dataset_id, content_hash)` |
| `document_chunks` | `warehouse.chunks` |
| `extractions` | `warehouse.facts` (`agency`→`org`) |
| `classifications` | `warehouse.classifications` |
| `source_activity` | `warehouse.source_activity` |
| `search_queries` | **dropped** as product; optional `ingest.search_logs` for duplicate-advisory debug |
| pgvector search API | internal only; product query is SQL on `published` |

---

## 4. Fact types

Closed set. Extractor `govops` v1 emits these seven. `agency` is not a warehouse fact type.

Every fact has:

- `text` — exact grounded substring
- `source_span` — `{start,end}` into the extraction text
- `normalized_value` — JSON object, schema per type below
- `attributes` — leftover extractor keys (`confidence: "fallback"`, `legacy_type`, langextract extras)

Ungrounded facts are discarded before insert (`filter_grounded_extractions`).

### 4.1 `money`

Surface examples (AS-IS regex): `$125,000`, `$ 125000.00`.

```json
{
  "amount_cents": 12500000,
  "amount_minor": 12500000,
  "currency": "USD",
  "raw": "$125,000",
  "unit": "currency"
}
```

Rules:

- Default currency `USD` if `$` present; `ARS` if `$` and document `language`/`geo_entity` country is `ar` **and** no `USD`/`U$S` marker — store `currency_inferred=true` in `attributes` and force review for `public`.
- `amount_cents` is integer. No floats.
- Ranges (`$1m–$2m`) become two facts or one fact with `normalized_value.range={min_cents,max_cents}`; v1 stores a single fact with `min_cents`/`max_cents` and `amount_cents=null` when both bounds exist.
- Fallback regex does not parse `ARS 1.250.000` or `125000` without `$`. Those wait for langextract or human edit.

### 4.2 `date`

Surface examples: `2026-06-01` (AS-IS regex `\b20\d{2}-\d{2}-\d{2}\b`).

```json
{
  "date": "2026-06-01",
  "precision": "day",
  "raw": "2026-06-01"
}
```

`precision`: `day | month | year`. Langextract dates like `June 1, 2026` normalize to ISO. Invalid calendar dates are stored with `valid=false` and `publishable=false`.

### 4.3 `ordinance`

Surface examples: `Ordinance 42`, `Resolution 12-A`, `Decree 2024-1` (AS-IS regex `\b(?:Ordinance|Resolution|Decree)\s+[A-Z0-9.-]+\b`).

```json
{
  "instrument": "ordinance",
  "identifier": "42",
  "raw": "Ordinance 42",
  "jurisdiction_geo_entity_id": "ar:060798"
}
```

`instrument` ∈ `ordinance | resolution | decree | law | other`. `identifier` is the token after the instrument word. Link to `warehouse.entities` (`entity_kind='ordinance'`, slug `{instrument}-{identifier}` lowercased) and optionally `entity_links` to `geo_entity` via the document dataset’s `geo_entity_id`.

### 4.4 `person`

No deterministic fallback today. Langextract / human only until a name NER version is pinned.

```json
{
  "full_name": "Ana Pérez",
  "role": "mayor",
  "raw": "Ana Pérez"
}
```

PII: person facts on `public` datasets require review. `redactPublicText` self-identification patterns may already have replaced first-person names in citizen uploads; third-person officials in ordinances are **not** stripped by the current regex (by design — they are civic facts). Do not run person facts through `[identity removed]` unless the span matched `SELF_IDENTIFICATION_RE`.

### 4.5 `org`

Replaces AS-IS `agency`. Fallback regex: `\b(?:City Council|Public Works|Health Department|Budget Office|Clerk Office)\b`.

```json
{
  "name": "City Council",
  "org_kind": "agency",
  "raw": "City Council",
  "institution_id": null
}
```

`org_kind` ∈ `agency | vendor | ngo | company | other`. If `name` slug-matches an `oltp.institutions.slug` or `name`, set `institution_id` and write `entity_links.target_kind='institution'`.

### 4.6 `place`

No deterministic fallback today.

```json
{
  "name": "Tandil",
  "raw": "Tandil",
  "geo_entity_id": "ar:060798",
  "lat": -37.32,
  "lon": -59.13,
  "path_prefix": "/ar/municipio/060798-tandil"
}
```

Resolution order (§5.2): exact `geo_entities.id`, then `path_prefix`, then `(country_code, search_name, level)`, then Nominatim-backed `osm_id`. Unresolved places stay with `geo_entity_id=null` and `resolution_status` in `attributes`.

### 4.7 `program`

No deterministic fallback today. Schema field exists in `govops_v1`.

```json
{
  "name": "Road Repair 2026",
  "raw": "Road Repair 2026",
  "fiscal_year": 2026
}
```

Link to money facts in the same document via `entity_links.target_kind='fact'` when a money span is in the same sentence (chunk). Optional; v1 linker may skip this and still publish the program fact.

### 4.8 Classification labels (document-level, not facts)

From `classification.py`: `budget`, `procurement`, `ordinance`, `public_health`, `infrastructure`, plus `general_government` default and `empty` for zero-length text. These are **not** fact types. They live on `warehouse.classifications`.

Public-request categories (`PUBLIC_REQUEST_CATEGORIES` in `public-portal.ts`: infrastructure, sanitation, mobility, safety, permits, housing, environment, corruption, other) are **OLTP** labels on `public_requests.category`. A warehouse document may `entity_link` to a public request; do not conflate classification labels with request categories.

---

## 5. ID join strategy

Three identifier families exist in the repo today. The warehouse joins them **by storing the OLTP id as text**, never by regenerating slugs at query time except for institutions (slug is derived in OLTP too).

### 5.1 Identifier catalog

| Entity | Canonical ID | Format | Minted in | Also known as |
|---|---|---|---|---|
| Geo entity | `geo_entities.id` | `{country}:{sourceId}` or `{country}:loc:{sourceId}` | D1 seed (`packages/db-cloudflare/seeds/geo-ar-19.sql`) | `path_prefix` `/ar/municipio/060798-tandil`; OSM `(osm_type, osm_id)` |
| Institution | `companies.id` | D1 text UUID | D1 insert | portal `slug` = `buildInstitutionPortalSlug(name, issuePrefix)` = `{issuePrefix.lower}-{slugify(name)}`; `issue_prefix` unique |
| Public request | `public_requests.id` | D1 text UUID | D1 insert | `public_id` = `createPublicRequestId(identifier, issueId)` (lowercased `CIU-12` or issue uuid); `issue_id` unique |
| Public contribution | `public_contributions.id` | D1 text UUID | Collaborate attribution | `content_hash` + `document_id` (Superparser/warehouse uuid) |
| Warehouse document | `warehouse.documents.id` | UUID | ingest | `content_hash` |
| Warehouse fact/entity | UUID | UUID | ingest / linker | — |
| Tenant place (claimed) | `tenant_instances.id` | UUID | D1 | `geo_id` → `geo_entities.id`; `path_prefix` may **override** the geo path when claimed (`public-geo.ts` getByPath fallback) |

Geo id examples from seed + schema comment:

- Municipio: `ar:060798`
- Provincia: `ar:30`
- Localidad: `ar:loc:30070030`
- Path: `/ar/localidad/30070030-el-solar`
- Id-path canonicalization: `/ar/municipio/{indecId}-{slug}` resolves to `ar:{indecId}` or `ar:loc:{indecId}` (`workers/api/src/lib/public-geo.ts` lines 130–138)

Institution slug example: name `Tandil`, prefix `CIU` → `ciu-tandil` (`buildInstitutionPortalSlug`).

Public request public_id example: identifier `CIU-12` → `ciu-12`.

### 5.2 Linking algorithm (normative)

Run after extraction, before review. Each fact may produce 0..n `entity_links`.

**Place facts → geo_entities**

1. If `normalized_value.geo_entity_id` already set and exists in `oltp.geo_entities` → `method=exact_id`, confidence `1.0`.
2. Else if `normalized_value.path_prefix` matches `oltp.geo_entities.path_prefix` → `method=slug`, confidence `0.99`.
3. Else if document `datasets.geo_entity_id` is set, search children (`parent_id` or `departamento_id` = that id, same as `publicGeoService.children`) for `search_name = unaccent(lower(place.name))` → `method=name_match`, confidence `0.85`.
4. Else search `oltp.geo_entities` where `country_code = dataset country` (default `ar`) and `search_name` exact → if one row, confidence `0.80`; if many, pick level weight provincia < municipio < departamento < localidad (same `LEVEL_WEIGHT` as `public-geo.ts`) and confidence `0.70` (review if public).
5. Else leave unresolved.

Do **not** call Nominatim from the linker on the hot ingest path. OSM backfill already happens lazily in OLTP (`public-geo.ts`, `public-portal.ts` place view). ETL copies `lat/lon/osm_*` when present.

**Org facts → institutions**

1. Exact `companies.id` if the ingest hinted `company_id` and org name equals that institution’s name.
2. `buildInstitutionPortalSlug(org.name, known_prefix)` vs `oltp.institutions.slug`.
3. Case-insensitive name match within the same `geo_entity` tree (institution’s `geo_entity_id` equals dataset geo or is a child).
4. Else unresolved `org` entity with no institution link.

**Ordinance / program / person** → warehouse-native `entities` first. Then:

- If the document was ingested from a heartbeat with `metadata.ciutatis.issueId`, and that issue has a `public_requests` row, link `target_kind='public_request'`, `method=ingest_hint`, confidence `1.0`.
- If `text` contains a token matching `public_requests.public_id` or `issues.identifier` (mirrored as `public_id`), `method=issue_identifier`, confidence `0.95`.

**Documents → geo / institution / public_request**

Every document gets at least:

- `entity_links` to `institution` = `documents.company_id` (`method=ingest_hint`, `1.0`) when `company_id` is a real institution (not the platform `public-contributions` bucket).
- `entity_links` to `geo_entity` = `datasets.geo_entity_id` when set.

Collaborate without institution: document stays on `ds_public_contributions`; geo/institution links only if the citizen UI later sends `geo_entity_id` / `institution_slug` (TO-BE form fields; AS-IS Collaborate form is file-only in `PublicApp.tsx`).

### 5.3 SQL join patterns (what published SQL authors write)

```sql
-- Money by municipality
SELECT g.name, SUM((f.normalized_value->>'amount_cents')::bigint) AS amount_cents
FROM facts f
JOIN entity_links el ON el.fact_id = f.id AND el.target_kind = 'geo_entity'
JOIN geo_entities g ON g.id = el.target_id
WHERE f.fact_type = 'money'
GROUP BY 1;

-- Facts attached to a citizen request
SELECT f.fact_type, f.text
FROM facts f
JOIN entity_links el ON el.fact_id = f.id AND el.target_kind = 'public_request'
JOIN public_requests pr ON pr.id = el.target_id
WHERE pr.public_id = 'ciu-12';

-- Institution spend vs extracted budget figures (usage_daily is control-plane tokens;
-- money facts are civic amounts — do not SUM them together without a comment)
SELECT i.name, u.day, u.cost_cents AS token_cost_cents
FROM usage_daily u
JOIN institutions i ON i.id = u.company_id
WHERE u.day >= DATE '2026-08-01';
```

Because `published` is the search_path, `facts` / `geo_entities` / `public_requests` / `institutions` / `usage_daily` resolve to the views in §3.14.

### 5.4 Non-joins (do not)

- Do not join warehouse `documents.id` to D1 `documents.id` (control-plane markdown work products, `packages/db-cloudflare/src/schema/documents.ts`). Different tables, different meaning.
- Do not join `public_contributions.document_id` to D1 `documents`. It is a Superparser/warehouse document uuid stored as text.
- Do not treat `tenant_instances.id` as `geo_entities.id`. Claimed places join `tenant_instances.geo_id = geo_entities.id`.
- Do not use `path_prefix` as a primary key in the warehouse; it can change when a tenant claims a geo row (`ON CONFLICT` in seeds preserves claimed `path_prefix`).

---

## 6. ETL from D1 / OLTP into the warehouse

D1 is the write path for civic **operations** (requests, geo claims, contributions attribution, token spend). The warehouse is the write path for civic **documents and facts**. ETL copies OLTP → `oltp.*` and rolls usage into `warehouse.usage_daily`. It never copies unredacted request contact fields into `published`.

### 6.1 Jobs

| Job | Cadence | Source | Destination | Mode |
|---|---|---|---|---|
| `etl_geo_entities` | hourly + on seed deploy | D1 `geo_entities` | `oltp.geo_entities` | upsert on `id`; source-of-truth is D1 |
| `etl_institutions` | 5 min | D1 `companies` + `tenant_instances.geo_id` | `oltp.institutions` | upsert; compute `slug` with `buildInstitutionPortalSlug` |
| `etl_public_requests` | 1 min | D1 `public_requests` + `public_request_updates` | `oltp.public_requests`, `oltp.public_request_updates` | upsert; skip `recovery_token_hash` into a warehouse column (do not copy the hash at all) |
| `etl_public_contributions` | 1 min | D1 `public_contributions` | `oltp.public_contributions` | append/upsert on `id`; `document_id` is warehouse uuid |
| `etl_usage_daily` | 15 min + 01:10 UTC finalize | D1 `cost_events`, `finance_events` | `oltp.cost_events_daily_src` then `warehouse.usage_daily` | delete+insert the current UTC day; finalize yesterday |
| `etl_ingest_usage` | with usage job | `ingest.jobs` / `ingest.blobs` | `usage_daily` columns `ingest_*` | merge on same grain with `provider='superparser'` |

Cloudflare D1 does not speak logical replication. ETL is **pull**: a Worker cron or the ingest Cloud Run process queries D1 (or the admin API) and upserts Postgres.

### 6.2 Geo upsert SQL

```sql
INSERT INTO oltp.geo_entities (
  id, country_code, level, jurisdiction_type, name, search_name, slug,
  path_prefix, parent_id, province_id, departamento_id, lat, lon,
  osm_type, osm_id, tenant_instance_id, category, source, updated_at, mirrored_at
) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,
          to_timestamp($19/1000.0), now())
ON CONFLICT (id) DO UPDATE SET
  level = excluded.level,
  jurisdiction_type = excluded.jurisdiction_type,
  name = excluded.name,
  search_name = excluded.search_name,
  slug = excluded.slug,
  path_prefix = excluded.path_prefix,
  parent_id = excluded.parent_id,
  province_id = excluded.province_id,
  departamento_id = excluded.departamento_id,
  lat = COALESCE(oltp.geo_entities.lat, excluded.lat),
  lon = COALESCE(oltp.geo_entities.lon, excluded.lon),
  osm_type = COALESCE(excluded.osm_type, oltp.geo_entities.osm_type),
  osm_id = COALESCE(excluded.osm_id, oltp.geo_entities.osm_id),
  tenant_instance_id = excluded.tenant_instance_id,
  category = excluded.category,
  source = excluded.source,
  updated_at = excluded.updated_at,
  mirrored_at = now();
```

`updated_at` in D1 is integer epoch-ms (`geo_entities.ts`). Convert on ingest. Preserve claimed `path_prefix` **in D1** (seed SQL already does); the warehouse copies whatever D1 currently has — it does not re-implement claim logic.

### 6.3 Institutions

```sql
-- slug is not a D1 column; compute in the ETL worker with the shared function
-- buildInstitutionPortalSlug(name, issuePrefix)
INSERT INTO oltp.institutions (
  id, name, slug, description, status, issue_prefix, brand_color, geo_entity_id,
  created_at, updated_at, mirrored_at
) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10, now())
ON CONFLICT (id) DO UPDATE SET
  name = excluded.name,
  slug = excluded.slug,
  description = excluded.description,
  status = excluded.status,
  issue_prefix = excluded.issue_prefix,
  brand_color = excluded.brand_color,
  geo_entity_id = COALESCE(excluded.geo_entity_id, oltp.institutions.geo_entity_id),
  updated_at = excluded.updated_at,
  mirrored_at = now();
```

`geo_entity_id`: `SELECT geo_id FROM tenant_instances WHERE …` is not 1:1 with companies today (tenants are places, companies are institutions). ETL sets `geo_entity_id` when an institution is bound to a claimed tenant in instance settings; otherwise NULL. Facts still join institutions via `company_id`.

### 6.4 Public requests

OLTP text is **already redacted** (`redactPublicText` at write). ETL copies `public_title`, `public_summary`, `public_description`, `pii_detected` as-is. It does **not** copy `recovery_token_hash`. `contact_name` / `contact_email` / `owner_user_id` / `submission_mode` land in `oltp.public_requests` for government SQL only and are omitted from `published.public_requests`.

Deletes: D1 `ON DELETE cascade` from `issues`. ETL treats missing rows since last cursor as deletes and `DELETE FROM oltp.public_requests WHERE id = ANY($1)`.

### 6.5 Public contributions

```sql
INSERT INTO oltp.public_contributions (
  id, user_id, content_hash, filename, content_type, status,
  document_id, classification_label, created_at, mirrored_at
) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, now())
ON CONFLICT (id) DO UPDATE SET
  status = excluded.status,
  document_id = excluded.document_id,
  classification_label = excluded.classification_label,
  mirrored_at = now();
```

`document_id` must match `warehouse.documents.id::text`. After Superparser cutover, Collaborate writes D1 and warehouse in the same worker request: warehouse commit first, then D1 attribution (today D1 is best-effort after Superparser returns; keep that ordering so a logging failure never breaks the citizen result — `collaborate.ts` lines 145–167).

Anonymous uploads still create **no** D1 row (same as today).

### 6.6 `usage_daily` rollup

D1 grain (`cost_events`): one row per inference/ingest event with `occurred_at` text ISO.

```sql
-- run in ETL worker against D1, then upsert Postgres
SELECT
  date(occurred_at)              AS day,           -- UTC date
  company_id,
  provider,
  biller,
  billing_type,
  model,
  SUM(input_tokens)              AS input_tokens,
  SUM(cached_input_tokens)       AS cached_input_tokens,
  SUM(output_tokens)             AS output_tokens,
  SUM(cost_cents)                AS cost_cents
FROM cost_events
WHERE occurred_at >= $start AND occurred_at < $end
GROUP BY 1,2,3,4,5,6;
```

Finance:

```sql
SELECT
  date(occurred_at) AS day,
  company_id,
  SUM(CASE WHEN direction = 'debit' THEN amount_cents ELSE 0 END)  AS finance_debit_cents,
  SUM(CASE WHEN direction = 'credit' THEN amount_cents ELSE 0 END) AS finance_credit_cents
FROM finance_events
WHERE occurred_at >= $start AND occurred_at < $end
GROUP BY 1,2;
```

Merge into `warehouse.usage_daily` on `(day, company_id, provider, biller, billing_type, model)`. Finance-only rows use `provider='finance'`, `biller` from the event, `billing_type=event_kind`, `model='-'`, token columns 0.

Ingest merge:

```sql
SELECT
  (finished_at AT TIME ZONE 'UTC')::date AS day,
  company_id,
  COUNT(*) FILTER (WHERE status IN ('succeeded','duplicate','reviewing')) AS ingest_jobs,
  COALESCE(SUM(b.byte_size),0) AS ingest_bytes,
  COUNT(DISTINCT d.id) AS ingest_documents
FROM ingest.jobs j
LEFT JOIN ingest.blobs b ON b.id = j.blob_id
LEFT JOIN warehouse.documents d ON d.job_id = j.id
WHERE j.finished_at >= $start AND j.finished_at < $end
GROUP BY 1,2;
```

Written as `provider='superparser'`, `biller='ciutatis'`, `billing_type='ingest'`, `model='-'` plus token/cost from `cost_events` when the worker emitted them.

Yesterday’s row is **immutable** after the 01:10 UTC finalize. Same-day rows are rewritten every 15 minutes.

### 6.7 Cursor and failure

ETL stores `ingest.etl_cursors (job_name text PK, last_success_at timestamptz, last_key text, error text)`. Geo uses `updated_at` integer watermark. Requests use `updated_at` ISO watermark. Cost events use `occurred_at`. At-least-once delivery is required; all upserts are idempotent on natural keys.

On D1 timeout: skip the tick, do not partial-commit usage_daily for that day (wrap in one Postgres transaction per job). Geo/institution upserts may partial-commit per batch of 500 ids.

### 6.8 Backfill from Superparser Postgres

Cutover job `migrate_legacy_superparser`:

1. Read `superparser.documents` + chunks + extractions + classifications from the Cloud SQL instance (`DATABASE_URL` / `SUPERPARSER_DATABASE_URL`).
2. Create `ingest.blobs` with `r2_key` placeholder if bytes were never stored (AS-IS keeps only `flat_text`). Bytes are **not** recoverable from flat_text for PDFs; set `blob_id NULL`, `metadata_json.legacy='superparser_flat_text_only'`.
3. Insert `warehouse.documents` with `flat_text` from legacy, run `redactPublicText` to fill `flat_text_redacted`.
4. Copy chunks; recast embeddings to `vector(768)` when length=768; drop 16-d deterministic demo embeddings (`DeterministicEmbeddingClient` dimensions=16) and leave `embedding NULL`.
5. Copy extractions → facts with `agency`→`org`, `extractor_version_id` = seed v1, `review_status='approved'` for operator `demo-company` data, `'pending'` for `public-contributions`.
6. Do not copy `search_queries`.

### 6.9 What ETL will not do

- ETL will not move D1 `issues`, comments, agent org charts, or heartbeat transcripts into `published`. Those stay control-plane.
- ETL will not publish `contact_email`.
- ETL will not treat Superparser as a query replica. After cutover, deleting `superparser.document_chunks` must not affect `published.facts`.
- ETL will not write D1 from the warehouse except the existing Collaborate attribution insert (application path, not ETL).

---

## 7. AS-IS file index (citations)

| Path | What it proves |
|---|---|
| `apps/superparser-service/superparser/api.py` | HTTP surface: ingest, collaborate, search, heartbeat, MCP |
| `apps/superparser-service/superparser/core/pipeline.py` | Job running/succeeded/failed; hash dedup; similar-doc advisory |
| `apps/superparser-service/superparser/core/normalization.py` | PDF 50 MiB / 1000 pages; CSV/XLSX/text flatten |
| `apps/superparser-service/superparser/core/chunking.py` | 1200/120 char chunks |
| `apps/superparser-service/superparser/core/extraction.py` | `govops_v1` fields; grounding filter; regex fallback |
| `apps/superparser-service/superparser/core/classification.py` | label set + confidence heuristic |
| `apps/superparser-service/superparser/core/gemini_gateway.py` | embed model `text-embedding-004`; 16-d demo fallback |
| `apps/superparser-service/superparser/clients/drive.py` | Drive fetch + native export map |
| `apps/superparser-service/superparser/integrations/ciutatis.py` | Heartbeat → ingest → issue comment/document |
| `apps/superparser-service/migrations/001_superparser_schema.sql` | Legacy Postgres + pgvector |
| `apps/superparser-service/migrations/002_collaborate_content_hash.sql` | `content_hash` + company index |
| `apps/superparser-service/cloud-run.yaml` | Separate Cloud Run + `SUPERPARSER_DATABASE_URL` |
| `apps/superparser-portal/` | Demo UI to fold into Next |
| `workers/api/src/routes/collaborate.ts` | 10 MiB, 12/10 min/IP, 503 if `SUPERPARSER_URL` empty, D1 attribution |
| `workers/api/wrangler.toml` | `SUPERPARSER_URL = ""`; D1 `ciutatis-db`; R2 `ciutatis-assets` |
| `packages/shared/src/public-portal.ts` | PII regexes; slugs; public_id; request categories/statuses |
| `packages/db-cloudflare/src/schema/geo_entities.ts` | Geo id scheme + levels |
| `packages/db-cloudflare/src/schema/public_requests.ts` | Request columns including `pii_detected` |
| `packages/db-cloudflare/src/schema/public_contributions.ts` | Citizen file attribution |
| `packages/db-cloudflare/src/schema/cost_events.ts` | Usage grain for `usage_daily` |
| `packages/db-cloudflare/src/schema/institutions.ts` | D1 table `companies` |
| `apps/landing/app/PublicApp.tsx` | Next Collaborate UI already on `/collaborate` |
| `apps/landing/src/admin/pages/ScrutinyPage.tsx` | No warehouse UI yet |

---

## 8. Cutover invariants (acceptance)

1. Superparser is not called for `SELECT`-shaped product traffic. `POST /v1/search` is not on the public site.
2. Every published fact has a document, a span, an extractor version, and `review_status IN ('approved','edited')`.
3. `published.documents.body` never contains a match for the `redactPublicText` patterns that `pii_detected` claimed to remove.
4. `published.public_requests` has no contact or recovery columns.
5. `usage_daily` for day D-1 at 01:30 UTC equals D1 `SUM(cost_cents)` for that UTC day (tolerance 0 cents) plus ingest merge.
6. Exact Collaborate re-upload still returns `status: duplicate` with the same `contentHash` and does not increment `ingest.quota_counters.bytes_used` except the HTTP hit on the rate window.
7. Geo joins use `geo_entities.id` text (`ar:…`), not regenerated integers.
8. Dataset visibility `private` rows are absent from `published` even for the owning company when the role is `sql_public`.
9. The Superparser portal package is not linked from production Next nav; its flows live under `apps/landing`.
10. Optional Parquet failure does not fail ingest jobs.
