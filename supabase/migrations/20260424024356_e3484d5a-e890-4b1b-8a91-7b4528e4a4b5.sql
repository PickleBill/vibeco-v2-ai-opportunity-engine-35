-- Add title column to idea_reports
ALTER TABLE public.idea_reports
ADD COLUMN IF NOT EXISTS title TEXT;

-- Create idea_stack_items table
CREATE TABLE IF NOT EXISTS public.idea_stack_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID NOT NULL REFERENCES public.idea_reports(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('highlight','deep_dive','expansion','persona','distill','note')),
  source TEXT,
  label TEXT NOT NULL,
  content TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  pinned BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stack_report ON public.idea_stack_items(report_id);
CREATE INDEX IF NOT EXISTS idx_stack_position ON public.idea_stack_items(report_id, position);

ALTER TABLE public.idea_stack_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read stack items"
ON public.idea_stack_items FOR SELECT
USING (true);

CREATE POLICY "Anyone can insert stack items"
ON public.idea_stack_items FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update stack items"
ON public.idea_stack_items FOR UPDATE
USING (true);

CREATE POLICY "Anyone can delete stack items"
ON public.idea_stack_items FOR DELETE
USING (true);