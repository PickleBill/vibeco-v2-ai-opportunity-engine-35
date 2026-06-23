-- ============================================================
-- simulator_captures: stop public email enumeration, scope writes
-- ============================================================
DROP POLICY IF EXISTS "anon_select_simulator_captures" ON public.simulator_captures;
DROP POLICY IF EXISTS "anon_update_simulator_captures" ON public.simulator_captures;

CREATE POLICY "Owners can read their captures"
ON public.simulator_captures FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Update ownerless or own captures"
ON public.simulator_captures FOR UPDATE TO anon, authenticated
USING (user_id IS NULL OR auth.uid() = user_id)
WITH CHECK (user_id IS NULL OR auth.uid() = user_id);
-- anon_insert_simulator_captures (INSERT WITH CHECK true) stays so anonymous auto-save works

-- ============================================================
-- idea_reports: keep public read (sharing), scope UPDATE to owner/anonymous
-- ============================================================
DROP POLICY IF EXISTS "Anon update idea_reports" ON public.idea_reports;

CREATE POLICY "Update ownerless or own reports"
ON public.idea_reports FOR UPDATE TO anon, authenticated
USING (user_id IS NULL OR auth.uid() = user_id)
WITH CHECK (user_id IS NULL OR auth.uid() = user_id);

-- ============================================================
-- idea_perspectives: scope writes via parent report ownership
-- ============================================================
DROP POLICY IF EXISTS "Anyone can insert perspectives" ON public.idea_perspectives;
DROP POLICY IF EXISTS "Anyone can update perspectives" ON public.idea_perspectives;

CREATE POLICY "Insert perspectives for ownerless or own reports"
ON public.idea_perspectives FOR INSERT TO anon, authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.idea_reports r
  WHERE r.id = report_id AND (r.user_id IS NULL OR r.user_id = auth.uid())
));

CREATE POLICY "Update perspectives for ownerless or own reports"
ON public.idea_perspectives FOR UPDATE TO anon, authenticated
USING (EXISTS (
  SELECT 1 FROM public.idea_reports r
  WHERE r.id = report_id AND (r.user_id IS NULL OR r.user_id = auth.uid())
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.idea_reports r
  WHERE r.id = report_id AND (r.user_id IS NULL OR r.user_id = auth.uid())
));

-- ============================================================
-- idea_stack_items: scope writes/deletes via parent report ownership
-- ============================================================
DROP POLICY IF EXISTS "Anyone can insert stack items" ON public.idea_stack_items;
DROP POLICY IF EXISTS "Anyone can update stack items" ON public.idea_stack_items;
DROP POLICY IF EXISTS "Anyone can delete stack items" ON public.idea_stack_items;

CREATE POLICY "Insert stack items for ownerless or own reports"
ON public.idea_stack_items FOR INSERT TO anon, authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM public.idea_reports r
  WHERE r.id = report_id AND (r.user_id IS NULL OR r.user_id = auth.uid())
));

CREATE POLICY "Update stack items for ownerless or own reports"
ON public.idea_stack_items FOR UPDATE TO anon, authenticated
USING (EXISTS (
  SELECT 1 FROM public.idea_reports r
  WHERE r.id = report_id AND (r.user_id IS NULL OR r.user_id = auth.uid())
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.idea_reports r
  WHERE r.id = report_id AND (r.user_id IS NULL OR r.user_id = auth.uid())
));

CREATE POLICY "Delete stack items for ownerless or own reports"
ON public.idea_stack_items FOR DELETE TO anon, authenticated
USING (EXISTS (
  SELECT 1 FROM public.idea_reports r
  WHERE r.id = report_id AND (r.user_id IS NULL OR r.user_id = auth.uid())
));

-- ============================================================
-- contact_submissions: admin-only read, keep anonymous insert
-- ============================================================
DROP POLICY IF EXISTS "anon_select_contact_submissions" ON public.contact_submissions;

CREATE POLICY "Admins can read contact submissions"
ON public.contact_submissions FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- has_role: remove direct executability by anonymous visitors
-- ============================================================
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;