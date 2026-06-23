
ALTER TABLE public.signal_raw ADD COLUMN IF NOT EXISTS scan_date date;
ALTER TABLE public.signal_clusters ADD COLUMN IF NOT EXISTS scan_date date;
ALTER TABLE public.feature_candidates ADD COLUMN IF NOT EXISTS scan_date date;
ALTER TABLE public.signal_themes ADD COLUMN IF NOT EXISTS scan_date date;

CREATE INDEX IF NOT EXISTS signal_raw_product_scan_idx ON public.signal_raw(product_tag, scan_date);
CREATE INDEX IF NOT EXISTS signal_clusters_product_scan_idx ON public.signal_clusters(product_tag, scan_date);
CREATE INDEX IF NOT EXISTS feature_candidates_product_scan_idx ON public.feature_candidates(product_tag, scan_date);
CREATE INDEX IF NOT EXISTS signal_themes_product_title_idx ON public.signal_themes(product_tag, title);
