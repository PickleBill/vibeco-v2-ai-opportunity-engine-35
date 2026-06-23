-- Signal Mine — RLS lockdown for the PUBLIC AI Opportunity Engine.
--
-- The Signal Board (/signal) is a public showcase: anonymous visitors must be
-- able to READ it, but must NOT be able to write to it. The four signal tables
-- originally shipped with wide-open "writable by everyone" policies
-- (FOR ALL USING (true) WITH CHECK (true)) — fine for a private prototype,
-- unsafe now that the project is public (any visitor could wipe or poison the
-- board).
--
-- The data pipeline writes via service-role edge functions — signal-collect,
-- signal-process, ingest-signal — and the service role BYPASSES RLS entirely,
-- so removing the public write policies does not break ingestion or scans.
--
-- Posture after this migration:
--   • anon + authenticated ....... SELECT only (the public board).
--   • feature_candidates / themes  an authenticated ADMIN (Bill) may UPDATE
--                                   status (Promote / Dismiss) from the browser.
--   • inserts / deletes / refresh   service_role only (edge functions).
--
-- RLS default-denies any operation without a matching permissive policy, so
-- dropping the open policies is itself the lockdown; the admin UPDATE policies
-- below re-open exactly the owner-gated Promote/Dismiss path. Idempotent.

-- ── 1. Drop the wide-open ALL policies (the actual vulnerability) ───────────
DROP POLICY IF EXISTS "signal_raw writable by everyone" ON public.signal_raw;
DROP POLICY IF EXISTS "signal_clusters writable by everyone" ON public.signal_clusters;
DROP POLICY IF EXISTS "feature_candidates writable by everyone" ON public.feature_candidates;
DROP POLICY IF EXISTS "signal_themes writable by everyone" ON public.signal_themes;

-- ── 2. Public read stays (the board is a showcase). Re-assert idempotently ──
DROP POLICY IF EXISTS "signal_raw readable by everyone" ON public.signal_raw;
CREATE POLICY "signal_raw readable by everyone" ON public.signal_raw FOR SELECT USING (true);

DROP POLICY IF EXISTS "signal_clusters readable by everyone" ON public.signal_clusters;
CREATE POLICY "signal_clusters readable by everyone" ON public.signal_clusters FOR SELECT USING (true);

DROP POLICY IF EXISTS "feature_candidates readable by everyone" ON public.feature_candidates;
CREATE POLICY "feature_candidates readable by everyone" ON public.feature_candidates FOR SELECT USING (true);

DROP POLICY IF EXISTS "signal_themes readable by everyone" ON public.signal_themes;
CREATE POLICY "signal_themes readable by everyone" ON public.signal_themes FOR SELECT USING (true);

-- ── 3. Owner-only Promote/Dismiss: authenticated admins flip status ─────────
-- Mirrors the has_role(auth.uid(),'admin') gate used for contact_submissions.
DROP POLICY IF EXISTS "Admins update feature_candidates" ON public.feature_candidates;
CREATE POLICY "Admins update feature_candidates"
  ON public.feature_candidates FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins update signal_themes" ON public.signal_themes;
CREATE POLICY "Admins update signal_themes"
  ON public.signal_themes FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Note: no INSERT/DELETE policies for anon/authenticated by design — RLS
-- default-denies, and the pipeline writes as service_role (bypasses RLS).
