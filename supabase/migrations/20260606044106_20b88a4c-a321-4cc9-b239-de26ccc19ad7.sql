-- Tighten SELECT on idea_perspectives to match report ownership (same as INSERT/UPDATE/DELETE)
DROP POLICY IF EXISTS "Anyone can read perspectives" ON public.idea_perspectives;
CREATE POLICY "Read perspectives for ownerless or own reports"
ON public.idea_perspectives
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.idea_reports r
    WHERE r.id = idea_perspectives.report_id
      AND (r.user_id IS NULL OR r.user_id = auth.uid())
  )
);

-- Tighten SELECT on idea_stack_items to match report ownership (same as INSERT/UPDATE/DELETE)
DROP POLICY IF EXISTS "Anyone can read stack items" ON public.idea_stack_items;
CREATE POLICY "Read stack items for ownerless or own reports"
ON public.idea_stack_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.idea_reports r
    WHERE r.id = idea_stack_items.report_id
      AND (r.user_id IS NULL OR r.user_id = auth.uid())
  )
);