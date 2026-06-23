-- The collector upserts ON CONFLICT (source_url); a partial unique index can't
-- be used for conflict inference. Replace it with a full unique index
-- (Postgres allows multiple NULLs in a unique index, so nullable source_url is fine).
DROP INDEX IF EXISTS public.uq_signal_raw_source_url;
CREATE UNIQUE INDEX IF NOT EXISTS uq_signal_raw_source_url
  ON public.signal_raw(source_url);