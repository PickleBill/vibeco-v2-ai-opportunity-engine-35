-- MCP telemetry: log every tool call so the system can learn from itself.
-- Used by Phase G (Self-Improving MCP) to detect patterns:
--   - Tools called frequently → consider caching
--   - Tools that fail often → likely bugs to fix
--   - Args patterns → suggest defaults
--   - Latency spikes → performance problems

CREATE TABLE IF NOT EXISTS public.mcp_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_name TEXT NOT NULL,
  args JSONB DEFAULT '{}',
  success BOOLEAN NOT NULL,
  error_message TEXT,
  latency_ms INTEGER,
  session_hint TEXT,  -- best-effort identifier of the calling session
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mcp_usage_tool ON public.mcp_usage_log(tool_name);
CREATE INDEX IF NOT EXISTS idx_mcp_usage_created ON public.mcp_usage_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mcp_usage_failures ON public.mcp_usage_log(tool_name, success) WHERE success = false;

-- Suggestions/insights produced by the analyzer
CREATE TABLE IF NOT EXISTS public.mcp_improvement_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL,  -- 'performance', 'reliability', 'usability', 'usage-pattern'
  priority TEXT NOT NULL DEFAULT 'medium',  -- 'high', 'medium', 'low'
  tool_name TEXT,  -- optional: which tool this is about
  observation TEXT NOT NULL,  -- what was observed in the data
  suggestion TEXT NOT NULL,  -- what to do about it
  status TEXT NOT NULL DEFAULT 'open',  -- 'open', 'acknowledged', 'implemented', 'dismissed'
  metrics JSONB DEFAULT '{}',  -- supporting numbers
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mcp_improvements_status ON public.mcp_improvement_log(status, priority);

-- RLS: telemetry is org-internal, allow reads/writes for service role
ALTER TABLE public.mcp_usage_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "MCP usage log readable by all" ON public.mcp_usage_log FOR SELECT USING (true);
CREATE POLICY "MCP usage log insertable by all" ON public.mcp_usage_log FOR INSERT WITH CHECK (true);

ALTER TABLE public.mcp_improvement_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "MCP improvements readable by all" ON public.mcp_improvement_log FOR SELECT USING (true);
CREATE POLICY "MCP improvements insertable by all" ON public.mcp_improvement_log FOR INSERT WITH CHECK (true);
CREATE POLICY "MCP improvements updatable by all" ON public.mcp_improvement_log FOR UPDATE USING (true);

COMMENT ON TABLE public.mcp_usage_log IS 'Every MCP tool call. Drives self-improving MCP analysis.';
COMMENT ON TABLE public.mcp_improvement_log IS 'AI-generated suggestions for improving the MCP server based on usage patterns.';
