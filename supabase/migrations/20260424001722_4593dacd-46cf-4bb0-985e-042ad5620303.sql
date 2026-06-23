ALTER TABLE public.project_registry
  ADD COLUMN IF NOT EXISTS manifest_cache jsonb,
  ADD COLUMN IF NOT EXISTS manifest_cached_at timestamp with time zone;

ALTER TABLE public.idea_reports
  ADD COLUMN IF NOT EXISTS imported_from_project_id uuid REFERENCES public.project_registry(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_idea_reports_imported_from ON public.idea_reports(imported_from_project_id);