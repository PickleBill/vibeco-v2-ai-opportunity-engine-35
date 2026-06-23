
DROP POLICY IF EXISTS "Allow public insert simulator_captures" ON public.simulator_captures;
DROP POLICY IF EXISTS "Allow public update simulator_captures" ON public.simulator_captures;
DROP POLICY IF EXISTS "No public reads simulator_captures" ON public.simulator_captures;

CREATE POLICY "Allow public insert simulator_captures"
ON public.simulator_captures FOR INSERT TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Allow public update simulator_captures"
ON public.simulator_captures FOR UPDATE TO anon, authenticated
USING (true) WITH CHECK (true);

CREATE POLICY "No public reads simulator_captures"
ON public.simulator_captures FOR SELECT TO authenticated
USING (false);

DROP POLICY IF EXISTS "Allow public insert contact_submissions" ON public.contact_submissions;
DROP POLICY IF EXISTS "No public reads contact_submissions" ON public.contact_submissions;

CREATE POLICY "Allow public insert contact_submissions"
ON public.contact_submissions FOR INSERT TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "No public reads contact_submissions"
ON public.contact_submissions FOR SELECT TO authenticated
USING (false);
