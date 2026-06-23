-- Signal Mine — social pain-point → product-feature pipeline.
-- See docs/SOCIAL_LISTENING_PRD.md. Three tables map to the pipeline:
--   signal_raw         (Stage 1 collect + Stage 2 classify)
--   signal_clusters    (Stage 3 cluster)
--   feature_candidates (Stage 4 synthesize + Stage 5 route)
--
-- RLS posture mirrors org_decisions: this is organizational knowledge, not
-- per-user data, so it's openly readable/insertable. Tighten before any
-- multi-tenant launch.

CREATE EXTENSION IF NOT EXISTS vector;

-- ── Stage 1/2: raw collected items + their classification ──────────────────
CREATE TABLE IF NOT EXISTS public.signal_raw (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source           TEXT NOT NULL,                 -- 'reddit' | 'appstore_review'
  source_url       TEXT,
  author_hash      TEXT,                          -- hashed, never raw PII
  title            TEXT,
  body             TEXT NOT NULL,
  product_tag      TEXT,                          -- which product this is about (e.g. 'niceace')
  raw              JSONB DEFAULT '{}',            -- provenance: original payload snapshot
  collected_at     TIMESTAMPTZ DEFAULT now(),
  -- Stage 2 classification
  processed        BOOLEAN DEFAULT false,
  label            TEXT,                          -- pain_point|feature_request|praise|question|noise|off_topic
  label_confidence NUMERIC,                       -- 0..1
  cluster_id       UUID,                          -- set in Stage 3
  embedding        vector(1536)                   -- optional, for pgvector clustering in prod
);

CREATE INDEX IF NOT EXISTS idx_signal_raw_product ON public.signal_raw(product_tag);
CREATE INDEX IF NOT EXISTS idx_signal_raw_processed ON public.signal_raw(processed);
CREATE INDEX IF NOT EXISTS idx_signal_raw_label ON public.signal_raw(label);
-- de-dupe guard: same source URL shouldn't be collected twice
CREATE UNIQUE INDEX IF NOT EXISTS uq_signal_raw_source_url
  ON public.signal_raw(source_url) WHERE source_url IS NOT NULL;

-- ── Stage 3: clusters of semantically-similar pain points ──────────────────
CREATE TABLE IF NOT EXISTS public.signal_clusters (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_tag  TEXT,
  theme        TEXT NOT NULL,                     -- short label for the shared complaint
  pain_score   NUMERIC DEFAULT 0,                 -- frequency × intensity × recency
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
  evidence             JSONB DEFAULT '{}',        -- {member_count, sources, pain_score}
  pain_score           NUMERIC DEFAULT 0,
  confidence           NUMERIC DEFAULT 0,         -- 0..100 from the agent mesh
  effort               TEXT,                      -- 'S'|'M'|'L' rough estimate
  status               TEXT DEFAULT 'open',       -- open|promoted|dismissed
  created_at           TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feature_candidates_product ON public.feature_candidates(product_tag);
CREATE INDEX IF NOT EXISTS idx_feature_candidates_status ON public.feature_candidates(status);

-- ── RLS (open, org-knowledge style — same as org_decisions) ────────────────
ALTER TABLE public.signal_raw ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.signal_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "signal_raw readable by everyone" ON public.signal_raw FOR SELECT USING (true);
CREATE POLICY "signal_raw writable by everyone" ON public.signal_raw FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "signal_clusters readable by everyone" ON public.signal_clusters FOR SELECT USING (true);
CREATE POLICY "signal_clusters writable by everyone" ON public.signal_clusters FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "feature_candidates readable by everyone" ON public.feature_candidates FOR SELECT USING (true);
CREATE POLICY "feature_candidates writable by everyone" ON public.feature_candidates FOR ALL USING (true) WITH CHECK (true);

-- ── Optional pgvector similarity search over raw items (prod clustering) ────
CREATE INDEX IF NOT EXISTS signal_raw_embedding_idx
  ON public.signal_raw USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE OR REPLACE FUNCTION public.match_signal_raw(
  query_embedding vector(1536),
  match_count int DEFAULT 20,
  filter_product text DEFAULT NULL
)
RETURNS TABLE (id uuid, title text, body text, source text, similarity float)
LANGUAGE sql STABLE AS $$
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
