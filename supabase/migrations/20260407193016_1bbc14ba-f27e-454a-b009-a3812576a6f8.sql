
-- Add report_id to simulator_captures to link captures to reports
ALTER TABLE public.simulator_captures
  ADD COLUMN IF NOT EXISTS report_id UUID REFERENCES public.idea_reports(id) ON DELETE SET NULL;

-- Add user_id, status, and parent_idea_id to idea_reports
ALTER TABLE public.idea_reports
  ADD COLUMN IF NOT EXISTS user_id UUID,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'in-progress',
  ADD COLUMN IF NOT EXISTS parent_idea_id UUID REFERENCES public.idea_reports(id) ON DELETE SET NULL;

-- Create index for user lookups on idea_reports
CREATE INDEX IF NOT EXISTS idx_idea_reports_user_id ON public.idea_reports(user_id);

-- Create index for parent idea lineage lookups
CREATE INDEX IF NOT EXISTS idx_idea_reports_parent_idea_id ON public.idea_reports(parent_idea_id);

-- Create index for report_id lookups on simulator_captures
CREATE INDEX IF NOT EXISTS idx_simulator_captures_report_id ON public.simulator_captures(report_id);
