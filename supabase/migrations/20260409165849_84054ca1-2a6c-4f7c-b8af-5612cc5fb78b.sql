
-- Add forked_context and alt_prompts columns to idea_reports
ALTER TABLE public.idea_reports
ADD COLUMN IF NOT EXISTS forked_context jsonb DEFAULT NULL,
ADD COLUMN IF NOT EXISTS alt_prompts jsonb DEFAULT '[]'::jsonb;

-- Add perspective_responses column to idea_perspectives (if not using existing user_responses)
-- user_responses already exists, so we'll use that column instead

-- Add comment for clarity
COMMENT ON COLUMN public.idea_reports.forked_context IS 'Carries highlights, anti-highlights, and parent brief context when forking an idea';
COMMENT ON COLUMN public.idea_reports.alt_prompts IS 'Stores generated Claude/ChatGPT/design prompts';
