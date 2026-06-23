CREATE TABLE public.idea_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idea text NOT NULL,
  brief jsonb NOT NULL,
  rounds jsonb NOT NULL DEFAULT '[]'::jsonb,
  lovable_prompt text,
  concept_image_url text,
  logo_image_url text,
  highlights text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.idea_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read by id" ON public.idea_reports
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Anon insert" ON public.idea_reports
  FOR INSERT TO anon, authenticated WITH CHECK (true);