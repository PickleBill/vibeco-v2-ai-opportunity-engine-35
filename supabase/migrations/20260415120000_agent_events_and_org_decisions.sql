-- Agent orchestration tables + shared organizational memory
-- Part of the Courtana AI-native architecture

-- Agent events: tracks progress of orchestrated workflows.
-- Frontend subscribes via Supabase Realtime to show live progress.
CREATE TABLE IF NOT EXISTS agent_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES idea_reports(id) ON DELETE CASCADE,
  agent TEXT NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'completed',
  data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_agent_events_report ON agent_events(report_id);

-- Enable Realtime so frontend can subscribe to live agent progress
ALTER PUBLICATION supabase_realtime ADD TABLE agent_events;

-- Organizational decisions: shared memory across Claude Code sessions.
-- Any session can write decisions/insights; any session can read them.
CREATE TABLE IF NOT EXISTS org_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT,
  project TEXT,
  category TEXT,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_org_decisions_project ON org_decisions(project);
CREATE INDEX idx_org_decisions_category ON org_decisions(category);

-- RLS: agent_events readable by authenticated users
ALTER TABLE agent_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agent events are viewable by everyone" ON agent_events FOR SELECT USING (true);
CREATE POLICY "Agent events are insertable by service role" ON agent_events FOR INSERT WITH CHECK (true);

-- RLS: org_decisions open (this is organizational knowledge, not user data)
ALTER TABLE org_decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org decisions are viewable by everyone" ON org_decisions FOR SELECT USING (true);
CREATE POLICY "Org decisions are insertable by everyone" ON org_decisions FOR INSERT WITH CHECK (true);
