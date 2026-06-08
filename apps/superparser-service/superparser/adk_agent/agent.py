from __future__ import annotations


INSTRUCTION = """
You are superparser, a GovOps document extraction and classification agent.
Use deterministic tools to ingest PDFs, spreadsheets, Google Docs, and Google Sheets.
Always preserve source metadata, grounded spans, and provenance. Do not invent facts.
When asked to process a document, call the Superparser API and return the job id,
classification, extraction count, and links or identifiers needed for review.
"""


try:  # pragma: no cover - ADK package is a deployment dependency
    from google.adk import Agent

    root_agent = Agent(
        name="superparser",
        model="gemini-flash-latest",
        instruction=INSTRUCTION,
    )
except Exception:  # pragma: no cover - local tests do not require ADK
    root_agent = {
        "name": "superparser",
        "model": "gemini-flash-latest",
        "instruction": INSTRUCTION,
    }
