# Superparser Demo Video Script

Date: 2026-06-08

## 0:00 - Problem

Government operations documents are scattered across PDFs, spreadsheets, Google Docs, and Google Sheets. Teams need searchable operational knowledge with provenance, not another ungrounded summary.

## 0:20 - Agent Architecture

Show Ciutatis assigning a governed parsing task to the `superparser` HTTP adapter. Explain that Ciutatis controls assignment, heartbeat, budget, and audit trail while the Cloud Run agent performs extraction.

## 0:45 - Intake

Open the civic ops console. Upload a procurement or budget document, then submit a Drive source. Point out source metadata: owners, last modifier, dates, export links, and activity/revision support.

## 1:15 - Extraction

Show the pipeline queue moving through normalization, grounded extraction, classification, embedding, and persistence. Open the document review panel and show grounded facts with source spans.

## 1:45 - Search

Run a semantic query such as `road repair budget`. Show nearest chunks and explain that Postgres stores both JSONB extraction payloads and vector embeddings.

## 2:10 - Governance Loop

Return to Ciutatis artifacts: the agent posts an issue comment and a `superparser-extraction` issue document. This keeps the autonomous document processor inside board governance.

## 2:35 - Closing

Superparser turns arbitrary government documents into classified, searchable, auditable operational knowledge. It is built as a production path: ADK agent, Cloud Run, Gemini, Postgres, and Ciutatis control-plane governance.
