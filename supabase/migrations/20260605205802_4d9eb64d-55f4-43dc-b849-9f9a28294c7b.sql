-- Signal Mine — corrected migration (tables, GRANTs, tightened RLS).
-- Public read; writes happen only via service_role in edge functions.

CREATE EXTENSION IF NOT EXISTS vector;

-- ── Stage 1/2: raw collected items + their classification ──────────────────
CREATE TABLE IF NOT EXISTS public.signal_raw (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source           TEXT NOT NULL,
  source_url       TEXT,
  author_hash      TEXT,
  title            TEXT,
  body             TEXT NOT NULL,
  product_tag      TEXT,
  raw              JSONB DEFAULT '{}',
  collected_at     TIMESTAMPTZ DEFAULT now(),
  processed        BOOLEAN DEFAULT false,
  label            TEXT,
  label_confidence NUMERIC,
  cluster_id       UUID,
  embedding        vector(1536)
);

CREATE INDEX IF NOT EXISTS idx_signal_raw_product ON public.signal_raw(product_tag);
CREATE INDEX IF NOT EXISTS idx_signal_raw_processed ON public.signal_raw(processed);
CREATE INDEX IF NOT EXISTS idx_signal_raw_label ON public.signal_raw(label);
CREATE UNIQUE INDEX IF NOT EXISTS uq_signal_raw_source_url
  ON public.signal_raw(source_url) WHERE source_url IS NOT NULL;

-- ── Stage 3: clusters of semantically-similar pain points ──────────────────
CREATE TABLE IF NOT EXISTS public.signal_clusters (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_tag  TEXT,
  theme        TEXT NOT NULL,
  pain_score   NUMERIC DEFAULT 0,
  member_count INT DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_signal_clusters_product ON public.signal_clusters(product_tag);

-- ── Stage 4/5: agent-synthesized feature candidates + routing state ────────
CREATE TABLE IF NOT EXISTS public.feature_candidates (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_id           UUID REFERENCES public.signal_clusters(id) ON DELETE SET NULL,
  product_tag          TEXT,
  problem              TEXT NOT NULL,
  proposed_solution    TEXT NOT NULL,
  representative_quotes JSONB DEFAULT '[]',
  evidence             JSONB DEFAULT '{}',
  pain_score           NUMERIC DEFAULT 0,
  confidence           NUMERIC DEFAULT 0,
  effort               TEXT,
  status               TEXT DEFAULT 'open',
  created_at           TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feature_candidates_product ON public.feature_candidates(product_tag);
CREATE INDEX IF NOT EXISTS idx_feature_candidates_status ON public.feature_candidates(status);

-- ── Pulse P1: durable, trend-tracked themes ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.signal_themes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_tag     TEXT,
  title           TEXT NOT NULL,
  status          TEXT DEFAULT 'open',
  pain_score      NUMERIC DEFAULT 0,
  score_history   JSONB DEFAULT '[]',
  occurrence_count INT DEFAULT 1,
  candidate_count INT DEFAULT 0,
  sample_quotes   JSONB DEFAULT '[]',
  first_seen      TIMESTAMPTZ DEFAULT now(),
  last_seen       TIMESTAMPTZ DEFAULT now(),
  embedding       vector(1536)
);

CREATE INDEX IF NOT EXISTS idx_signal_themes_product ON public.signal_themes(product_tag);
CREATE INDEX IF NOT EXISTS idx_signal_themes_status ON public.signal_themes(status);

ALTER TABLE public.feature_candidates
  ADD COLUMN IF NOT EXISTS theme_id UUID REFERENCES public.signal_themes(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_feature_candidates_theme ON public.feature_candidates(theme_id);

-- ── GRANTs: public read, service_role full (edge functions write) ──────────
GRANT SELECT ON public.signal_raw TO anon, authenticated;
GRANT ALL ON public.signal_raw TO service_role;
GRANT SELECT ON public.signal_clusters TO anon, authenticated;
GRANT ALL ON public.signal_clusters TO service_role;
GRANT SELECT ON public.feature_candidates TO anon, authenticated;
GRANT ALL ON public.feature_candidates TO service_role;
GRANT SELECT ON public.signal_themes TO anon, authenticated;
GRANT ALL ON public.signal_themes TO service_role;

-- ── RLS: public SELECT only; no public write policies ──────────────────────
ALTER TABLE public.signal_raw ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signal_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signal_themes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "signal_raw readable by everyone" ON public.signal_raw FOR SELECT USING (true);
CREATE POLICY "signal_clusters readable by everyone" ON public.signal_clusters FOR SELECT USING (true);
CREATE POLICY "feature_candidates readable by everyone" ON public.feature_candidates FOR SELECT USING (true);
CREATE POLICY "signal_themes readable by everyone" ON public.signal_themes FOR SELECT USING (true);

-- ── pgvector similarity search over raw items (prod clustering) ─────────────
CREATE INDEX IF NOT EXISTS signal_raw_embedding_idx
  ON public.signal_raw USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE OR REPLACE FUNCTION public.match_signal_raw(
  query_embedding vector(1536),
  match_count int DEFAULT 20,
  filter_product text DEFAULT NULL
)
RETURNS TABLE (id uuid, title text, body text, source text, similarity float)
LANGUAGE sql STABLE
SET search_path = public
AS $$
  SELECT id, title, body, source, 1 - (embedding <=> query_embedding) AS similarity
  FROM public.signal_raw
  WHERE embedding IS NOT NULL
    AND (filter_product IS NULL OR product_tag = filter_product)
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;

COMMENT ON TABLE public.signal_raw IS 'Signal Mine: raw collected social items + Stage-2 classification.';
COMMENT ON TABLE public.signal_clusters IS 'Signal Mine: Stage-3 clusters of similar pain points.';
COMMENT ON TABLE public.feature_candidates IS 'Signal Mine: Stage-4 agent-synthesized features + Stage-5 routing state.';
COMMENT ON TABLE public.signal_themes IS 'Pulse: durable, trend-tracked themes that persist across Signal Mine scans.';