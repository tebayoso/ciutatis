create schema if not exists superparser;

create extension if not exists pgcrypto;
create extension if not exists vector;

create table if not exists superparser.ingestion_jobs (
  id uuid primary key,
  company_id text not null,
  status text not null check (status in ('queued', 'running', 'succeeded', 'failed')),
  source_type text not null,
  source_ref text,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists superparser.documents (
  id uuid primary key,
  company_id text not null,
  job_id uuid not null references superparser.ingestion_jobs(id) on delete cascade,
  title text not null,
  source_type text not null,
  source_ref text,
  content_type text not null,
  flat_text text not null,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists superparser.document_chunks (
  id uuid primary key,
  company_id text not null,
  document_id uuid not null references superparser.documents(id) on delete cascade,
  ordinal int not null,
  text text not null,
  token_estimate int not null,
  source_span_json jsonb not null,
  embedding vector(768) not null,
  created_at timestamptz not null default now()
);

create table if not exists superparser.extractions (
  id uuid primary key,
  company_id text not null,
  document_id uuid not null references superparser.documents(id) on delete cascade,
  chunk_id uuid references superparser.document_chunks(id) on delete set null,
  type text not null,
  text text not null,
  source_span_json jsonb not null,
  attributes_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists superparser.classifications (
  id uuid primary key,
  company_id text not null,
  document_id uuid not null references superparser.documents(id) on delete cascade,
  label text not null,
  confidence real not null,
  rationale text not null,
  created_at timestamptz not null default now()
);

create table if not exists superparser.source_activity (
  id uuid primary key default gen_random_uuid(),
  company_id text not null,
  document_id uuid references superparser.documents(id) on delete cascade,
  source_provider text not null,
  source_id text not null,
  activity_json jsonb not null,
  occurred_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists superparser.search_queries (
  id uuid primary key default gen_random_uuid(),
  company_id text not null,
  query text not null,
  result_count int not null,
  created_at timestamptz not null default now()
);

create index if not exists superparser_jobs_company_status_idx on superparser.ingestion_jobs(company_id, status);
create index if not exists superparser_documents_company_created_idx on superparser.documents(company_id, created_at desc);
create index if not exists superparser_documents_metadata_gin_idx on superparser.documents using gin(metadata_json);
create index if not exists superparser_extractions_company_type_idx on superparser.extractions(company_id, type);
create index if not exists superparser_extractions_attributes_gin_idx on superparser.extractions using gin(attributes_json);
create index if not exists superparser_chunks_embedding_hnsw_idx
  on superparser.document_chunks using hnsw (embedding vector_cosine_ops);
