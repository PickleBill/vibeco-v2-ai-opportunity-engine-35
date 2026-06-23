CREATE TABLE public.discovery_leads (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL,
  company text,
  bottleneck text,
  engagement_preference text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.discovery_leads TO authenticated;
GRANT INSERT ON public.discovery_leads TO anon;
GRANT ALL ON public.discovery_leads TO service_role;

ALTER TABLE public.discovery_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a discovery lead"
ON public.discovery_leads
FOR INSERT
TO anon, authenticated
WITH CHECK (true);