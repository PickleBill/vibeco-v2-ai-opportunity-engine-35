
CREATE TABLE IF NOT EXISTS idea_perspectives (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID REFERENCES idea_reports(id) ON DELETE CASCADE,
  persona TEXT NOT NULL CHECK (persona IN ('skeptic', 'champion', 'competitor', 'customer', 'builder')),
  perspective TEXT NOT NULL,
  challenge_questions JSONB DEFAULT '[]'::jsonb,
  user_responses JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(report_id, persona)
);

ALTER TABLE idea_perspectives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read perspectives" ON idea_perspectives
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert perspectives" ON idea_perspectives
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update perspectives" ON idea_perspectives
  FOR UPDATE USING (true);

ALTER TABLE idea_reports
  ADD COLUMN IF NOT EXISTS thunderdome_unlocked BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS thesis_statement TEXT,
  ADD COLUMN IF NOT EXISTS prompt_versions JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS annotations JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS expanded_ideas JSONB DEFAULT '[]'::jsonb;
