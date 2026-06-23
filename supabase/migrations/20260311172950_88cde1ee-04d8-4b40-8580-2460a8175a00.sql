
DROP POLICY IF EXISTS "Anyone can submit contact form" ON public.contact_submissions;
DROP POLICY IF EXISTS "No public reads on contact_submissions" ON public.contact_submissions;

CREATE POLICY "Allow public insert contact_submissions"
ON public.contact_submissions
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "No public reads contact_submissions"
ON public.contact_submissions
FOR SELECT
TO authenticated
USING (false);
