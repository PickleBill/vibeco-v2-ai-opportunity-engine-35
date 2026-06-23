-- PR #1 sync: AI Opportunity Engine — RLS lockdown + signal_verticals + opportunity_roadmaps + corrected cron.

-- ── 1. RLS lockdown on signal_* tables ─────────────────────────────────────
DROP POLICY IF EXISTS "signal_raw writable by everyone" ON public.signal_raw;
DROP POLICY IF EXISTS "signal_clusters writable by everyone" ON public.signal_clusters;
DROP POLICY IF EXISTS "feature_candidates writable by everyone" ON public.feature_candidates;
DROP POLICY IF EXISTS "signal_themes writable by everyone" ON public.signal_themes;

DROP POLICY IF EXISTS "signal_raw readable by everyone" ON public.signal_raw;
CREATE POLICY "signal_raw readable by everyone" ON public.signal_raw FOR SELECT USING (true);
DROP POLICY IF EXISTS "signal_clusters readable by everyone" ON public.signal_clusters;
CREATE POLICY "signal_clusters readable by everyone" ON public.signal_clusters FOR SELECT USING (true);
DROP POLICY IF EXISTS "feature_candidates readable by everyone" ON public.feature_candidates;
CREATE POLICY "feature_candidates readable by everyone" ON public.feature_candidates FOR SELECT USING (true);
DROP POLICY IF EXISTS "signal_themes readable by everyone" ON public.signal_themes;
CREATE POLICY "signal_themes readable by everyone" ON public.signal_themes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins update feature_candidates" ON public.feature_candidates;
CREATE POLICY "Admins update feature_candidates" ON public.feature_candidates FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins update signal_themes" ON public.signal_themes;
CREATE POLICY "Admins update signal_themes" ON public.signal_themes FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Re-assert GRANTs (anon/authenticated SELECT only; service_role full).
REVOKE INSERT, UPDATE, DELETE ON public.signal_raw, public.signal_clusters, public.signal_themes, public.feature_candidates FROM anon;
REVOKE INSERT, DELETE ON public.signal_raw, public.signal_clusters, public.signal_themes, public.feature_candidates FROM authenticated;
GRANT SELECT ON public.signal_raw, public.signal_clusters, public.signal_themes, public.feature_candidates TO anon, authenticated;
GRANT UPDATE ON public.feature_candidates, public.signal_themes TO authenticated;
GRANT ALL ON public.signal_raw, public.signal_clusters, public.signal_themes, public.feature_candidates TO service_role;

-- ── 2. signal_slug helper + signal_verticals ───────────────────────────────
CREATE OR REPLACE FUNCTION public.signal_slug(s text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT COALESCE(NULLIF(trim(both '-' FROM regexp_replace(lower(s), '[^a-z0-9]+', '-', 'g')), ''), 'untagged');
$$;

CREATE TABLE IF NOT EXISTS public.signal_verticals (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_tag   TEXT NOT NULL UNIQUE,
  vertical      TEXT NOT NULL,
  subreddits    TEXT[]  NOT NULL DEFAULT '{}',
  keywords      TEXT[]  NOT NULL DEFAULT '{}',
  lookback_days INT     NOT NULL DEFAULT 7,
  enabled       BOOLEAN NOT NULL DEFAULT true,
  created_by    UUID,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.signal_verticals TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.signal_verticals TO authenticated;
GRANT ALL ON public.signal_verticals TO service_role;

ALTER TABLE public.signal_verticals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "signal_verticals readable by everyone" ON public.signal_verticals;
CREATE POLICY "signal_verticals readable by everyone" ON public.signal_verticals FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins insert signal_verticals" ON public.signal_verticals;
CREATE POLICY "Admins insert signal_verticals" ON public.signal_verticals FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins update signal_verticals" ON public.signal_verticals;
CREATE POLICY "Admins update signal_verticals" ON public.signal_verticals FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins delete signal_verticals" ON public.signal_verticals;
CREATE POLICY "Admins delete signal_verticals" ON public.signal_verticals FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.signal_verticals (product_tag, vertical, subreddits, keywords, lookback_days)
VALUES (
  public.signal_slug('Wholesale distribution / 3PL'),
  'Wholesale distribution / 3PL',
  ARRAY['logistics','freight','supplychain','smallbusiness','procurement','shipping','Entrepreneur'],
  ARRAY['3PL','freight broker','LTL','less than truckload','warehouse','WMS','inventory management',
        'EDI','purchase order','backorder','fulfillment','carrier','customs broker','spreadsheet'],
  7
) ON CONFLICT (product_tag) DO NOTHING;

-- ── 3. opportunity_roadmaps ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.opportunity_roadmaps (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_tag   TEXT NOT NULL,
  scan_date     DATE,
  summary       TEXT,
  market_read   TEXT,
  opportunities JSONB NOT NULL DEFAULT '[]',
  model         TEXT,
  generated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.opportunity_roadmaps TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.opportunity_roadmaps TO authenticated;
GRANT ALL ON public.opportunity_roadmaps TO service_role;

CREATE INDEX IF NOT EXISTS idx_opportunity_roadmaps_product
  ON public.opportunity_roadmaps(product_tag, scan_date DESC);

ALTER TABLE public.opportunity_roadmaps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "opportunity_roadmaps readable by everyone" ON public.opportunity_roadmaps;
CREATE POLICY "opportunity_roadmaps readable by everyone" ON public.opportunity_roadmaps FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins insert opportunity_roadmaps" ON public.opportunity_roadmaps;
CREATE POLICY "Admins insert opportunity_roadmaps" ON public.opportunity_roadmaps FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins update opportunity_roadmaps" ON public.opportunity_roadmaps;
CREATE POLICY "Admins update opportunity_roadmaps" ON public.opportunity_roadmaps FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "Admins delete opportunity_roadmaps" ON public.opportunity_roadmaps;
CREATE POLICY "Admins delete opportunity_roadmaps" ON public.opportunity_roadmaps FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ── 4. Cron drivers + schedule ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.run_signal_collect()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  base TEXT := 'https://brpqtaaknxdqkjvzfvlo.supabase.co/functions/v1';
  key  TEXT := 'sb_publishable_CPiVPJHnvgSMhvhVP1v6Sw_XpAgItPD';
  hdr  JSONB := jsonb_build_object('Content-Type','application/json','apikey',key);
  v    RECORD;
BEGIN
  FOR v IN SELECT * FROM public.signal_verticals WHERE enabled LOOP
    PERFORM net.http_post(
      url => base || '/signal-collect',
      headers => hdr,
      body => jsonb_build_object(
        'product', v.product_tag, 'vertical', v.vertical,
        'subreddits', to_jsonb(v.subreddits), 'keywords', to_jsonb(v.keywords),
        'lookback_days', v.lookback_days, 'persist', true
      )
    );
  END LOOP;
END $fn$;

CREATE OR REPLACE FUNCTION public.run_signal_process()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  base TEXT := 'https://brpqtaaknxdqkjvzfvlo.supabase.co/functions/v1';
  key  TEXT := 'sb_publishable_CPiVPJHnvgSMhvhVP1v6Sw_XpAgItPD';
  hdr  JSONB := jsonb_build_object('Content-Type','application/json','apikey',key);
  v    RECORD;
BEGIN
  FOR v IN SELECT * FROM public.signal_verticals WHERE enabled LOOP
    PERFORM net.http_post(
      url => base || '/signal-process',
      headers => hdr,
      body => jsonb_build_object(
        'product', v.product_tag, 'product_context', v.vertical, 'persist', true
      )
    );
  END LOOP;
END $fn$;

DO $do$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron;
  CREATE EXTENSION IF NOT EXISTS pg_net;
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'signal-collect-daily') THEN
    PERFORM cron.unschedule('signal-collect-daily');
  END IF;
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'signal-process-daily') THEN
    PERFORM cron.unschedule('signal-process-daily');
  END IF;
  PERFORM cron.schedule('signal-collect-daily', '0 13 * * *',  'SELECT public.run_signal_collect();');
  PERFORM cron.schedule('signal-process-daily', '15 13 * * *', 'SELECT public.run_signal_process();');
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'cron not scheduled: %', SQLERRM;
END $do$;
