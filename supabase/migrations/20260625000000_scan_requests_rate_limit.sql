-- Public self-serve "add-a-vertical" scans run a LITE tier (cheap keyless
-- adapters). This table is the rate-limit ledger so an anonymous visitor can't
-- spam the pipeline and run up the bill. Written + read ONLY by the edge
-- functions via the service role; not public-readable (it holds hashed client
-- keys, not useful to clients).

CREATE TABLE IF NOT EXISTS public.scan_requests (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_key  TEXT NOT NULL,                 -- hashed IP / session (never the raw IP)
  product_tag TEXT,
  tier        TEXT NOT NULL DEFAULT 'lite',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Lookups are (client_key, recent) for the per-client cap and (tier, recent)
-- for the global daily backstop.
CREATE INDEX IF NOT EXISTS scan_requests_client_time ON public.scan_requests (client_key, created_at DESC);
CREATE INDEX IF NOT EXISTS scan_requests_tier_time   ON public.scan_requests (tier, created_at DESC);

-- RLS on, with NO permissive policies → anon/authenticated get nothing; the
-- service role (used by signal-collect) bypasses RLS to read/insert.
ALTER TABLE public.scan_requests ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.scan_requests IS 'Rate-limit ledger for public LITE self-serve scans. Service-role only.';
