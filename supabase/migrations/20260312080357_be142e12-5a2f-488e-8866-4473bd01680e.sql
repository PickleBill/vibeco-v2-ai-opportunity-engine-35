CREATE POLICY "Anon update idea_reports" ON public.idea_reports
  FOR UPDATE TO anon, authenticated
  USING (true)
  WITH CHECK (true);