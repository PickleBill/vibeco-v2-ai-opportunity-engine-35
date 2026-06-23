-- Signal Mine — Opportunity Roadmap storage.
--
-- The opportunity-roadmap edge function runs the AI Gateway over the LIVE
-- feature_candidates / signal_themes for a vertical and drafts a build-or-sell
-- roadmap. We cache the latest roadmap per (product_tag, scan_date) so the board
-- can show it without re-spending tokens on every view.
--
-- Same public posture as the rest of the board: anon reads, only admins /
-- service-role write. Additive + idempotent.

CREATE TABLE IF NOT EXISTS public.opportunity_roadmaps (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_tag   TEXT NOT NULL,
  scan_date     DATE,
  summary       TEXT,
  market_read   TEXT,
  opportunities JSONB NOT NULL DEFAULT '[]',   -- [{ rank, title, problem, build, customer, motion, effort, roi, confidence, based_on }]
  model         TEXT,
  generated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_opportunity_roadmaps_product
  ON public.opportunity_roadmaps(product_tag, scan_date DESC);

ALTER TABLE public.opportunity_roadmaps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "opportunity_roadmaps readable by everyone" ON public.opportunity_roadmaps;
CREATE POLICY "opportunity_roadmaps readable by everyone"
  ON public.opportunity_roadmaps FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins insert opportunity_roadmaps" ON public.opportunity_roadmaps;
CREATE POLICY "Admins insert opportunity_roadmaps"
  ON public.opportunity_roadmaps FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins update opportunity_roadmaps" ON public.opportunity_roadmaps;
CREATE POLICY "Admins update opportunity_roadmaps"
  ON public.opportunity_roadmaps FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins delete opportunity_roadmaps" ON public.opportunity_roadmaps;
CREATE POLICY "Admins delete opportunity_roadmaps"
  ON public.opportunity_roadmaps FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

COMMENT ON TABLE public.opportunity_roadmaps IS 'Signal Mine: AI-drafted build-or-sell roadmap over the live clusters, cached per (product_tag, scan_date).';
