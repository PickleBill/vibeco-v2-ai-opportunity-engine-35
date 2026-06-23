-- Signal Mine — vertical config table + corrected nightly cron.
--
-- Two problems with the original cron (20260605020000_signal_mine_cron.sql):
--   1. It pointed at the WRONG project (ulgoahsxkrkzoquvntei — a stale ref from
--      the parent VibeCo project); this project is brpqtaaknxdqkjvzfvlo.
--   2. It hardcoded product=niceace (the golf demo), so a scheduled run could
--      never populate a real vertical.
--
-- This migration introduces signal_verticals (one row per niche the engine
-- listens to) and reschedules the nightly jobs to iterate every ENABLED vertical
-- against the correct project. The same table powers the board's vertical
-- selector, honest empty states, and the owner's "add a vertical" UI.
--
-- Additive + idempotent. If pg_cron / pg_net aren't available the scheduling
-- block no-ops (the manual Run scan button always still works).

-- ── slug(): mirror the TS slug() used by ingest-signal so both collection ──
-- paths (server-side cron + external scanner) land on the SAME product_tag.
CREATE OR REPLACE FUNCTION public.signal_slug(s text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT COALESCE(
    NULLIF(trim(both '-' FROM regexp_replace(lower(s), '[^a-z0-9]+', '-', 'g')), ''),
    'untagged'
  );
$$;

-- ── signal_verticals: per-vertical scan configuration ──────────────────────
CREATE TABLE IF NOT EXISTS public.signal_verticals (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_tag   TEXT NOT NULL UNIQUE,            -- slug(vertical) — the board's scoping key
  vertical      TEXT NOT NULL,                   -- human label, e.g. 'Wholesale distribution / 3PL'
  subreddits    TEXT[]  NOT NULL DEFAULT '{}',   -- subreddits to scan (no 'r/')
  keywords      TEXT[]  NOT NULL DEFAULT '{}',   -- pain keywords (OR-joined per sub)
  lookback_days INT     NOT NULL DEFAULT 7,
  enabled       BOOLEAN NOT NULL DEFAULT true,
  created_by    UUID,                            -- owner (auth.uid()) when added via UI
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.signal_verticals ENABLE ROW LEVEL SECURITY;

-- Public read (board labels + empty-state copy). Admin-only writes.
DROP POLICY IF EXISTS "signal_verticals readable by everyone" ON public.signal_verticals;
CREATE POLICY "signal_verticals readable by everyone"
  ON public.signal_verticals FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins insert signal_verticals" ON public.signal_verticals;
CREATE POLICY "Admins insert signal_verticals"
  ON public.signal_verticals FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins update signal_verticals" ON public.signal_verticals;
CREATE POLICY "Admins update signal_verticals"
  ON public.signal_verticals FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins delete signal_verticals" ON public.signal_verticals;
CREATE POLICY "Admins delete signal_verticals"
  ON public.signal_verticals FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ── Seed the first vertical: freight-adjacent (default per the AIOE charter) ─
-- product_tag is computed via signal_slug() so the cron and the external
-- scanner agree. Change/extend from the board UI.
INSERT INTO public.signal_verticals (product_tag, vertical, subreddits, keywords, lookback_days)
VALUES (
  public.signal_slug('Wholesale distribution / 3PL'),
  'Wholesale distribution / 3PL',
  ARRAY['logistics','freight','supplychain','smallbusiness','procurement','shipping','Entrepreneur'],
  ARRAY['3PL','freight broker','LTL','less than truckload','warehouse','WMS','inventory management',
        'EDI','purchase order','backorder','fulfillment','carrier','customs broker','spreadsheet'],
  7
)
ON CONFLICT (product_tag) DO NOTHING;

-- ── Cron drivers: fire the pipeline for every enabled vertical ──────────────
-- Uses the PUBLIC publishable key (the same opaque key shipped to every
-- browser) as the apikey — safe to commit; RLS + the functions' own
-- service-role context do the privileged work. SECURITY DEFINER so the
-- scheduled job can reach net.http_post regardless of the cron role.
CREATE OR REPLACE FUNCTION public.run_signal_collect()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
        'product', v.product_tag,
        'vertical', v.vertical,
        'subreddits', to_jsonb(v.subreddits),
        'keywords', to_jsonb(v.keywords),
        'lookback_days', v.lookback_days,
        'persist', true
      )
    );
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.run_signal_process()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
        'product', v.product_tag,
        'product_context', v.vertical,
        'persist', true
      )
    );
  END LOOP;
END $$;

-- ── Schedule: collect 13:00 UTC, process 13:15 UTC, daily ───────────────────
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron;
  CREATE EXTENSION IF NOT EXISTS pg_net;

  -- Replace the stale jobs (old ones POSTed to the wrong project / niceace).
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'signal-collect-daily') THEN
    PERFORM cron.unschedule('signal-collect-daily');
  END IF;
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'signal-process-daily') THEN
    PERFORM cron.unschedule('signal-process-daily');
  END IF;

  PERFORM cron.schedule('signal-collect-daily', '0 13 * * *',  'SELECT public.run_signal_collect();');
  PERFORM cron.schedule('signal-process-daily', '15 13 * * *', 'SELECT public.run_signal_process();');

  RAISE NOTICE 'Signal Mine cron rescheduled for brpqtaaknxdqkjvzfvlo (collect 13:00 / process 13:15 UTC, all enabled verticals).';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Signal Mine cron not scheduled (manual Run scan still works): %', SQLERRM;
END $$;

COMMENT ON TABLE public.signal_verticals IS 'Signal Mine: per-vertical scan config (subreddits/keywords) driving the nightly cron, the board vertical selector, and the owner add-a-vertical UI.';
