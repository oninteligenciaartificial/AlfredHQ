-- Audit logs table for security monitoring
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  workspace_id UUID REFERENCES workspaces(id),
  action TEXT NOT NULL,
  resource TEXT,
  result TEXT NOT NULL CHECK (result IN ('success', 'failure', 'blocked')),
  ip INET,
  user_agent TEXT,
  request_id TEXT,
  details JSONB,
  level TEXT NOT NULL CHECK (level IN ('info', 'warn', 'error', 'critical')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for audit logs: read-only for admins, append-only for all
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own workspace audit logs" ON audit_logs
  FOR SELECT USING (
    workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
    OR user_id = auth.uid()
  );

CREATE POLICY "System can insert audit logs" ON audit_logs
  FOR INSERT WITH CHECK (true);

-- No UPDATE or DELETE allowed on audit logs (immutable)
-- This is enforced by NOT having UPDATE/DELETE policies

-- Indexes for audit log queries
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_logs_workspace ON audit_logs(workspace_id, created_at DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action, created_at DESC);
CREATE INDEX idx_audit_logs_level ON audit_logs(level, created_at DESC);

-- Function: get recent failed logins for rate limiting
CREATE OR REPLACE FUNCTION get_recent_failed_logins(p_ip TEXT, p_minutes INT DEFAULT 15)
RETURNS BIGINT AS $$
  SELECT COUNT(*)
  FROM audit_logs
  WHERE action = 'LOGIN_FAILED'
    AND ip = p_ip::INET
    AND created_at > now() - (p_minutes || ' minutes')::INTERVAL;
$$ LANGUAGE sql SECURITY DEFINER;

-- Function: detect suspicious activity
CREATE OR REPLACE FUNCTION detect_suspicious_activity(p_user_id UUID)
RETURNS TABLE (
  alert_type TEXT,
  details JSONB,
  created_at TIMESTAMPTZ
) AS $$
  SELECT
    'multiple_failed_logins' AS alert_type,
    json_build_object('count', COUNT(*), 'ip', ip) AS details,
    MAX(created_at) AS created_at
  FROM audit_logs
  WHERE user_id = p_user_id
    AND action = 'LOGIN_FAILED'
    AND created_at > now() - INTERVAL '15 minutes'
  GROUP BY ip
  HAVING COUNT(*) >= 5

  UNION ALL

  SELECT
    'access_denied_spike' AS alert_type,
    json_build_object('count', COUNT(*), 'resource', resource) AS details,
    MAX(created_at) AS created_at
  FROM audit_logs
  WHERE user_id = p_user_id
    AND result = 'blocked'
    AND created_at > now() - INTERVAL '5 minutes'
  GROUP BY resource
  HAVING COUNT(*) >= 10;
$$ LANGUAGE sql SECURITY DEFINER;
