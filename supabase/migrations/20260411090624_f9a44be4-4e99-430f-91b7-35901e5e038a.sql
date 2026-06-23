
-- Create enums for project categories and statuses
CREATE TYPE public.project_category AS ENUM ('partner', 'internal_dev', 'future_dev', 'fun', 'client', 'experiment');
CREATE TYPE public.project_status AS ENUM ('active', 'paused', 'shipped', 'archived');

-- Create project_registry table
CREATE TABLE public.project_registry (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  lovable_project_id TEXT,
  name TEXT NOT NULL,
  description TEXT,
  category project_category NOT NULL DEFAULT 'experiment',
  status project_status NOT NULL DEFAULT 'active',
  parent_brand TEXT,
  report_id UUID REFERENCES public.idea_reports(id) ON DELETE SET NULL,
  notes TEXT,
  priority INTEGER NOT NULL DEFAULT 0,
  last_touched TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.project_registry ENABLE ROW LEVEL SECURITY;

-- Users can only see their own projects
CREATE POLICY "Users can view their own projects"
ON public.project_registry FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can insert their own projects
CREATE POLICY "Users can insert their own projects"
ON public.project_registry FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can update their own projects
CREATE POLICY "Users can update their own projects"
ON public.project_registry FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Users can delete their own projects
CREATE POLICY "Users can delete their own projects"
ON public.project_registry FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_project_registry_updated_at
BEFORE UPDATE ON public.project_registry
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index for user lookups
CREATE INDEX idx_project_registry_user_id ON public.project_registry(user_id);
CREATE INDEX idx_project_registry_category ON public.project_registry(category);
CREATE INDEX idx_project_registry_parent_brand ON public.project_registry(parent_brand);
