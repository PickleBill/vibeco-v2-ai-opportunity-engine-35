-- Signal Mine — W6 dogfood loop: deepen a feature candidate by running it back
-- through the v1 Simulator (simulate-idea + persona-perspective). See the
-- signal-candidate-deepen edge function and _shared/agents/candidate-deepen.ts.
--
-- Additive + idempotent: one CURRENT deep-read per candidate (UNIQUE on
-- feature_candidate_id; the edge function delete-then-inserts to replace), plus
-- a nullable `deepened_at` stamp surfaced on the candidate row so the board can
-- show "deepened ✓" without a join.
--
-- RLS posture mirrors the rest of Signal Mine after 20260623200000_signal_rls_lockdown:
--   • anon + authenticated ....... SELECT only (the public board / showcase).
--   • insert / update / delete .... service_role only (the edge function bypasses RLS).

-- ── Deep-read results, keyed by feature_candidate_id ───────────────────────
CREATE TABLE IF NOT EXISTS public.signal_candidate_simulations (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_candidate_id UUID NOT NULL REFERENCES public.feature_candidates(id) ON DELETE CASCADE,
  product_tag          TEXT,
  idea_prompt          TEXT NOT NULL,             -- the prefill idea sent to the simulator
  brief                JSONB DEFAULT '{}',        -- simulate-idea brief (BriefData)
  perspectives         JSONB DEFAULT '[]',        -- [{persona, headline, perspective, challenge_questions}]
  model_mode           TEXT,                      -- 'fast' | 'deep'
  created_at           TIMESTAMPTZ DEFAULT now()
);

-- One current deep-read per candidate ("keyed by feature_candidate_id").
CREATE UNIQUE INDEX IF NOT EXISTS uq_signal_candidate_simulations_candidate
  ON public.signal_candidate_simulations(feature_candidate_id);
CREATE INDEX IF NOT EXISTS idx_signal_candidate_simulations_product
  ON public.signal_candidate_simulations(product_tag);

-- ── Surface the deep-read on the candidate row (nullable; NULL = not deepened) ──
ALTER TABLE public.feature_candidates
  ADD COLUMN IF NOT EXISTS deepened_at TIMESTAMPTZ;

-- ── RLS (public read, service-role write — same posture as the signal tables) ──
ALTER TABLE public.signal_candidate_simulations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "signal_candidate_simulations readable by everyone" ON public.signal_candidate_simulations;
CREATE POLICY "signal_candidate_simulations readable by everyone"
  ON public.signal_candidate_simulations FOR SELECT USING (true);

-- No INSERT/UPDATE/DELETE policies for anon/authenticated by design — RLS
-- default-denies, and the deepen edge function writes as service_role.
GRANT SELECT ON public.signal_candidate_simulations TO anon, authenticated;
GRANT ALL    ON public.signal_candidate_simulations TO service_role;

COMMENT ON TABLE public.signal_candidate_simulations IS
  'W6 dogfood loop: per-candidate deep read from running a feature_candidate back through the v1 Simulator (simulate-idea brief + Skeptic/Customer/Builder personas).';
COMMENT ON COLUMN public.feature_candidates.deepened_at IS
  'When this candidate was last run through the dogfood Simulator loop (signal-candidate-deepen). NULL = never deepened.';
