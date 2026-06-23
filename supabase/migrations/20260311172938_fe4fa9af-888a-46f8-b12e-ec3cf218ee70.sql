
-- Drop the restrictive policies and recreate as permissive
DROP POLICY IF EXISTS "Anyone can submit simulator capture" ON public.simulator_captures;
DROP POLICY IF EXISTS "Anyone can update simulator capture" ON public.simulator_captures;
DROP POLICY IF EXISTS "No public reads on simulator_captures" ON public.simulator_captures;

-- Permissive INSERT policy
CREATE POLICY "Allow public insert simulator_captures"
ON public.simulator_captures
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Permissive UPDATE policy  
CREATE POLICY "Allow public update simulator_captures"
ON public.simulator_captures
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Keep reads restricted
CREATE POLICY "No public reads simulator_captures"
ON public.simulator_captures
FOR SELECT
TO authenticated
USING (false);
