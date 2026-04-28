-- ============================================================
-- FINAL STABLE SCHEMA (OpenAI Embeddings 1536)
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Enable extension
create extension if not exists vector;

-- 2. Create table (TRUNCATE existing if necessary)
-- TRUNCATE TABLE documents; 

create table if not exists documents (
  id          serial primary key,
  content     text        not null,
  metadata    jsonb       not null default '{}',
  embedding   vector(1536), -- Standard OpenAI dimension
  created_at  timestamptz not null default now()
);

-- 3. Match function
create or replace function match_documents (
  query_embedding  vector(1536),
  match_count      int     default 5,
  match_threshold  float   default 0.1
)
returns table (
  id           int,
  content      text,
  metadata     jsonb,
  similarity   float
)
language sql stable
as $$
  select
    d.id,
    d.content,
    d.metadata,
    1 - (d.embedding <=> query_embedding) as similarity
  from documents d
  where 1 - (d.embedding <=> query_embedding) > match_threshold
  order by d.embedding <=> query_embedding
  limit match_count;
$$;
