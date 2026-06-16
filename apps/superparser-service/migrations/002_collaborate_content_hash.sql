-- Collaborate / dedup support: a content hash lets us recognise a document we
-- have already aggregated before spending any embedding/extraction cost.
alter table superparser.documents
  add column if not exists content_hash text;

-- Exact-match dedup lookup is scoped per tenant (company_id).
create index if not exists superparser_documents_company_hash_idx
  on superparser.documents(company_id, content_hash);
