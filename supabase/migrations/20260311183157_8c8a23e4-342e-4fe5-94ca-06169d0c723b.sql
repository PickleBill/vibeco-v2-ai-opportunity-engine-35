-- Fix simulator_captures: drop RESTRICTIVE policies, create PERMISSIVE ones
DROP POLICY IF EXISTS "Allow public insert simulator_captures" ON public.simulator_captures;
DROP POLICY IF EXISTS "Allow public update simulator_captures" ON public.simulator_captures;
DROP POLICY IF EXISTS "Allow minimal reads simulator_captures" ON public.simulator_captures;

CREATE POLICY "anon_insert_simulator_captures"
ON public.simulator_captures FOR INSERT TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "anon_update_simulator_captures"
ON public.simulator_captures FOR UPDATE TO anon, authenticated
USING (true) WITH CHECK (true);

CREATE POLICY "anon_select_simulator_captures"
ON public.simulator_captures FOR SELECT TO anon, authenticated
USING (true);

-- Fix contact_submissions: drop RESTRICTIVE policies, create PERMISSIVE ones
DROP POLICY IF EXISTS "Allow public insert contact_submissions" ON public.contact_submissions;
DROP POLICY IF EXISTS "No public reads contact_submissions" ON public.contact_submissions;

CREATE POLICY "anon_insert_contact_submissions"
ON public.contact_submissions FOR INSERT TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "anon_select_contact_submissions"
ON public.contact_submissions FOR SELECT TO authenticated
USING (false);