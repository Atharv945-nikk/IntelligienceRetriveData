-- ============================================================
-- Cortex Obsidian – RAG App Schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- 1. Enable the pgvector extension (required for similarity search)
create extension if not exists vector;

-- ============================================================
-- 2. documents
--    Stores metadata for each uploaded file.
-- ============================================================
create table if not exists documents (
  id          uuid primary key default gen_random_uuid(),
  name        text        not null,
  size_bytes  bigint      not null default 0,
  num_pages   int         not null default 0,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- 3. document_chunks
--    Each row is one text chunk + its embedding vector.
--    The embedding column uses 1536 dimensions to match
--    OpenAI's text-embedding-3-small output.
-- ============================================================
create table if not exists document_chunks (
  id           uuid    primary key default gen_random_uuid(),
  document_id  uuid    not null references documents (id) on delete cascade,
  chunk_index  int     not null,
  content      text    not null,
  embedding    vector(1536),
  created_at   timestamptz not null default now()
);

-- Index for fast cosine-similarity lookups
create index if not exists document_chunks_embedding_idx
  on document_chunks
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- ============================================================
-- 4. Similarity search function
--    Called from the /api/chat route handler.
-- ============================================================
create or replace function match_chunks (
  query_embedding  vector(1536),
  match_count      int     default 5,
  match_threshold  float   default 0.5
)
returns table (
  id           uuid,
  document_id  uuid,
  content      text,
  similarity   float
)
language sql stable
as $$
  select
    dc.id,
    dc.document_id,
    dc.content,
    1 - (dc.embedding <=> query_embedding) as similarity
  from document_chunks dc
  where 1 - (dc.embedding <=> query_embedding) > match_threshold
  order by dc.embedding <=> query_embedding
  limit match_count;
$$;
