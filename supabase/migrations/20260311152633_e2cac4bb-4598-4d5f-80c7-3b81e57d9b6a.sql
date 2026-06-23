
-- Contact form submissions
CREATE TABLE public.contact_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  idea TEXT NOT NULL,
  structure TEXT NOT NULL DEFAULT 'Revenue Share',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (public form)
CREATE POLICY "Anyone can submit contact form"
  ON public.contact_submissions FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- No public reads
CREATE POLICY "No public reads on contact_submissions"
  ON public.contact_submissions FOR SELECT
  TO authenticated
  USING (false);

-- Simulator email captures with full session data
CREATE TABLE public.simulator_captures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  idea TEXT NOT NULL,
  rounds JSONB NOT NULL DEFAULT '[]'::jsonb,
  concept_image_url TEXT,
  logo_image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.simulator_captures ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts
CREATE POLICY "Anyone can submit simulator capture"
  ON public.simulator_captures FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- No public reads
CREATE POLICY "No public reads on simulator_captures"
  ON public.simulator_captures FOR SELECT
  TO authenticated
  USING (false);
