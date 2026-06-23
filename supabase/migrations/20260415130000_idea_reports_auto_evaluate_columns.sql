-- Add auto-evaluation columns to idea_reports for the Idea Lab flywheel.
-- These capture the results of batch auto-evaluation (source, score, verdict)
-- so the VibeCo UI can show an "inbox" of pre-scored ideas ranked by confidence.

ALTER TABLE public.idea_reports
  ADD COLUMN IF NOT EXISTS auto_score INTEGER,
  ADD COLUMN IF NOT EXISTS auto_verdict TEXT,
  ADD COLUMN IF NOT EXISTS auto_source TEXT,
  ADD COLUMN IF NOT EXISTS auto_synthesis JSONB,
  ADD COLUMN IF NOT EXISTS auto_perspectives JSONB,
  ADD COLUMN IF NOT EXISTS auto_expansion JSONB,
  ADD COLUMN IF NOT EXISTS auto_distillation JSONB;

-- Index for filtering the inbox view by score
CREATE INDEX IF NOT EXISTS idx_idea_reports_auto_source ON public.idea_reports(auto_source) WHERE auto_source IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_idea_reports_auto_score ON public.idea_reports(auto_score DESC) WHERE auto_score IS NOT NULL;

COMMENT ON COLUMN public.idea_reports.auto_score IS 'Confidence score (0-100) from auto-evaluate pipeline';
COMMENT ON COLUMN public.idea_reports.auto_verdict IS 'high-confidence | worth-exploring | needs-work';
COMMENT ON COLUMN public.idea_reports.auto_source IS 'Where the idea came from: idea-lab, pickle-daas, manual, etc.';
COMMENT ON COLUMN public.idea_reports.auto_synthesis IS 'Full synthesis output from auto-evaluate';
COMMENT ON COLUMN public.idea_reports.auto_perspectives IS 'Thunderdome perspectives from auto-evaluate';
COMMENT ON COLUMN public.idea_reports.auto_expansion IS 'Expansion output from auto-evaluate';
COMMENT ON COLUMN public.idea_reports.auto_distillation IS 'Distillation output from auto-evaluate';
