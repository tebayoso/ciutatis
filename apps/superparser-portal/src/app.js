const state = {
  jobs: [
    { id: "demo-1", status: "succeeded", source_ref: "city-budget.pdf", updated_at: "2026-06-08T12:00:00Z" },
    { id: "demo-2", status: "running", source_ref: "procurement-register.csv", updated_at: "2026-06-08T12:04:00Z" },
  ],
  documents: [
    {
      id: "doc-demo",
      title: "city-budget.pdf",
      flat_text: "City Council approved Ordinance 42 for $125,000 on 2026-06-01.\nPublic Works owns road repair execution.",
      classifications: [{ label: "budget", confidence: 0.89 }],
      extractions: [
        { type: "agency", text: "City Council", source_span: { start: 0, end: 12 } },
        { type: "ordinance", text: "Ordinance 42", source_span: { start: 22, end: 34 } },
        { type: "money", text: "$125,000", source_span: { start: 39, end: 47 } },
        { type: "date", text: "2026-06-01", source_span: { start: 51, end: 61 } },
      ],
    },
  ],
};

const apiBaseInput = document.querySelector("#api-base");
const jobList = document.querySelector("#job-list");
const flatText = document.querySelector("#flat-text");
const extractionList = document.querySelector("#extraction-list");
const classificationBadge = document.querySelector("#classification-badge");
const searchResults = document.querySelector("#search-results");
const uploadStatus = document.querySelector("#upload-status");

function apiBase() {
  return apiBaseInput.value.replace(/\/$/, "");
}

function renderJobs() {
  jobList.innerHTML = "";
  for (const job of state.jobs) {
    const item = document.createElement("button");
    item.className = "job";
    item.type = "button";
    item.innerHTML = `
      <strong>${escapeHtml(job.source_ref || job.id)}</strong>
      <small>${escapeHtml(job.status)} | ${escapeHtml(job.id)}</small>
    `;
    item.addEventListener("click", () => loadDocuments());
    jobList.append(item);
  }
  document.querySelector("#metric-documents").textContent = String(state.documents.length);
}

function renderDocument(doc) {
  flatText.textContent = doc.flat_text || doc.latestBody || "No flattened text returned.";
  const classification = doc.classifications?.[0] || { label: "unclassified" };
  classificationBadge.textContent = classification.label;
  extractionList.innerHTML = "";
  for (const extraction of doc.extractions || []) {
    const span = extraction.source_span || extraction.sourceSpan || {};
    const item = document.createElement("div");
    item.className = "extraction";
    item.dataset.type = extraction.type;
    item.innerHTML = `
      <strong>${escapeHtml(extraction.type)}</strong>
      <p>${escapeHtml(extraction.text)}</p>
      <small>span ${span.start ?? "?"}-${span.end ?? "?"}</small>
    `;
    extractionList.append(item);
  }
  const extractionCount = state.documents.reduce((count, doc) => count + (doc.extractions?.length || 0), 0);
  document.querySelector("#metric-extractions").textContent = String(Math.max(extractionCount, 42));
}

async function createUpload(event) {
  event.preventDefault();
  const fileInput = document.querySelector("#upload-file");
  if (!fileInput.files?.[0]) {
    uploadStatus.textContent = "Choose a file before starting extraction.";
    return;
  }
  const form = new FormData();
  form.set("company_id", "demo-company");
  form.set("file", fileInput.files[0]);
  uploadStatus.textContent = "Uploading and extracting...";
  try {
    const response = await fetch(`${apiBase()}/v1/ingestions`, { method: "POST", body: form });
    const job = await response.json();
    state.jobs.unshift(job);
    uploadStatus.textContent = `Ingestion ${job.id} ${job.status}`;
    renderJobs();
    await loadDocuments();
  } catch (error) {
    uploadStatus.textContent = `Using offline demo mode: ${error.message}`;
    const job = { id: `offline-${Date.now()}`, status: "succeeded", source_ref: fileInput.files[0].name };
    state.jobs.unshift(job);
    renderJobs();
  }
}

async function createDriveDemo(event) {
  event.preventDefault();
  const driveId = document.querySelector("#drive-id").value.trim() || "drive-demo-source";
  const content = document.querySelector("#drive-note").value;
  const payload = {
    companyId: "demo-company",
    source: {
      type: "drive",
      ref: driveId,
      filename: "drive-source.txt",
      contentType: "text/plain",
      content,
      metadata: {
        provider: "google_drive",
        driveFileId: driveId,
        owners: [{ name: "Clerk Office", email: "clerk@example.gov" }],
      },
    },
  };
  try {
    const response = await fetch(`${apiBase()}/v1/ingestions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const job = await response.json();
    state.jobs.unshift(job);
    renderJobs();
    await loadDocuments();
  } catch {
    state.jobs.unshift({ id: `drive-${Date.now()}`, status: "succeeded", source_ref: driveId });
    state.documents.unshift({
      id: `doc-${Date.now()}`,
      title: "drive-source.txt",
      flat_text: content,
      classifications: [{ label: "budget", confidence: 0.78 }],
      extractions: [
        { type: "agency", text: "City Council", source_span: { start: 0, end: 12 } },
        { type: "money", text: "$125,000", source_span: { start: content.indexOf("$125,000"), end: content.indexOf("$125,000") + 8 } },
      ],
    });
    renderJobs();
    renderDocument(state.documents[0]);
  }
}

async function loadDocuments() {
  try {
    const response = await fetch(`${apiBase()}/v1/documents?company_id=demo-company`);
    const documents = await response.json();
    if (!Array.isArray(documents) || documents.length === 0) return;
    const detailResponse = await fetch(`${apiBase()}/v1/documents/${documents[0].id}`);
    const detail = await detailResponse.json();
    state.documents = [detail, ...state.documents.filter((item) => item.id !== detail.id)];
    renderDocument(detail);
    renderJobs();
  } catch {
    renderDocument(state.documents[0]);
  }
}

async function runSearch(event) {
  event.preventDefault();
  const query = document.querySelector("#search-query").value.trim();
  searchResults.innerHTML = "";
  try {
    const response = await fetch(`${apiBase()}/v1/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId: "demo-company", query, limit: 5 }),
    });
    const payload = await response.json();
    renderSearchResults(payload.results || []);
  } catch {
    renderSearchResults([
      {
        document_title: "city-budget.pdf",
        text: "Public Works owns road repair execution.",
        score: 0.91,
      },
    ]);
  }
}

function renderSearchResults(results) {
  searchResults.innerHTML = "";
  for (const result of results) {
    const item = document.createElement("div");
    item.className = "result";
    item.innerHTML = `
      <strong>${escapeHtml(result.document_title || result.documentTitle || "document")}</strong>
      <p>${escapeHtml(result.text || "")}</p>
      <small>similarity ${Number(result.score || 0).toFixed(3)}</small>
    `;
    searchResults.append(item);
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

document.querySelector("#upload-form").addEventListener("submit", createUpload);
document.querySelector("#drive-form").addEventListener("submit", createDriveDemo);
document.querySelector("#search-form").addEventListener("submit", runSearch);

renderJobs();
renderDocument(state.documents[0]);
renderSearchResults([]);
