
CREATE POLICY "Anyone can update simulator capture"
ON public.simulator_captures
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);
