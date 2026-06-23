
-- Allow anon SELECT so upserts can return/detect conflicts via PostgREST
DROP POLICY IF EXISTS "No public reads simulator_captures" ON public.simulator_captures;

CREATE POLICY "Allow minimal reads simulator_captures"
ON public.simulator_captures
FOR SELECT TO anon, authenticated
USING (true);

-- Cleanup test row
DELETE FROM public.simulator_captures WHERE email = 'rls-test@vibeco.app';
