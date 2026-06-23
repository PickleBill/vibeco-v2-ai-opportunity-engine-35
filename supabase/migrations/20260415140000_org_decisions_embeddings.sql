-- Add semantic memory search to org_decisions.
-- Enables sessions to query "find decisions similar to what I'm working on"
-- rather than just filtering by project/category.

-- 1. Enable pgvector extension (Supabase has this available)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Add embedding column (1536 dims = OpenAI text-embedding-3-small)
ALTER TABLE public.org_decisions
  ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- 3. Index for fast similarity search
-- ivfflat is good for "good enough" similarity at lower storage cost
CREATE INDEX IF NOT EXISTS org_decisions_embedding_idx
  ON public.org_decisions
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- 4. RPC function for similarity search
-- Returns decisions ranked by cosine similarity to the query embedding
CREATE OR REPLACE FUNCTION public.match_decisions(
  query_embedding vector(1536),
  match_count int DEFAULT 10,
  filter_project text DEFAULT NULL,
  filter_category text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  session_id text,
  project text,
  category text,
  title text,
  content text,
  created_at timestamptz,
  similarity float
)
LANGUAGE sql STABLE AS $$
  SELECT
    id,
    session_id,
    project,
    category,
    title,
    content,
    created_at,
    1 - (embedding <=> query_embedding) AS similarity
  FROM public.org_decisions
  WHERE
    embedding IS NOT NULL
    AND (filter_project IS NULL OR project = filter_project)
    AND (filter_category IS NULL OR category = filter_category)
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;

COMMENT ON COLUMN public.org_decisions.embedding IS 'OpenAI text-embedding-3-small (1536 dims) of title + content';
COMMENT ON FUNCTION public.match_decisions IS 'Similarity search over org_decisions using cosine distance. Pass OpenAI embedding of query.';
