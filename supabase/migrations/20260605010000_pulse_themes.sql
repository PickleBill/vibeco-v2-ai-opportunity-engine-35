-- Pulse P1 — durable themes + trend memory.
-- Signal Mine clusters are per-scan and ephemeral. signal_themes makes a theme
-- persist across scans: matched on each run, with a pain_score history so the
-- Signal Board / Pulse cockpit can show whether a pain is rising or fading.
-- See docs/SENTIMENT_TO_ROADMAP.md (P1).

CREATE TABLE IF NOT EXISTS public.signal_themes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_tag     TEXT,
  title           TEXT NOT NULL,
  status          TEXT DEFAULT 'open',          -- open|promoted|dismissed|merged
  pain_score      NUMERIC DEFAULT 0,            -- latest score
  score_history   JSONB DEFAULT '[]',           -- [{ t: iso, s: number, c: candidate_count }]
  occurrence_count INT DEFAULT 1,               -- how many scans this theme appeared in
  candidate_count INT DEFAULT 0,                -- signals backing the latest appearance
  sample_quotes   JSONB DEFAULT '[]',
  first_seen      TIMESTAMPTZ DEFAULT now(),
  last_seen       TIMESTAMPTZ DEFAULT now(),
  embedding       vector(1536)                  -- optional, for similarity matching in prod
);

CREATE INDEX IF NOT EXISTS idx_signal_themes_product ON public.signal_themes(product_tag);
CREATE INDEX IF NOT EXISTS idx_signal_themes_status ON public.signal_themes(status);

-- Link feature candidates to the durable theme they belong to.
ALTER TABLE public.feature_candidates
  ADD COLUMN IF NOT EXISTS theme_id UUID REFERENCES public.signal_themes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_feature_candidates_theme ON public.feature_candidates(theme_id);

-- RLS (open, org-knowledge style — same as the rest of Signal Mine)
ALTER TABLE public.signal_themes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "signal_themes readable by everyone" ON public.signal_themes FOR SELECT USING (true);
CREATE POLICY "signal_themes writable by everyone" ON public.signal_themes FOR ALL USING (true) WITH CHECK (true);

COMMENT ON TABLE public.signal_themes IS 'Pulse: durable, trend-tracked themes that persist across Signal Mine scans.';
COMMENT ON COLUMN public.signal_themes.score_history IS 'Append-only pain_score timeline: [{t:iso, s:score, c:candidates}] — powers the trend sparkline.';
