-- Alfred Database Schema — isolated in 'alfred' schema
-- Deployed in DentaGest's Supabase project (kvepqgikokjlacxngkiw)
-- Zero interference with DentaGest's 'public' schema
-- To migrate: copy this file, apply to new Supabase project, update env vars

-- Create schema
CREATE SCHEMA IF NOT EXISTS alfred;

-- Enable UUID extension (already enabled in public, but safe to re-run)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================
-- TABLES
-- =====================

-- Workspaces
CREATE TABLE IF NOT EXISTS alfred.workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  plan TEXT DEFAULT 'internal' CHECK (plan IN ('internal', 'starter', 'pro')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Social accounts
CREATE TABLE IF NOT EXISTS alfred.social_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES alfred.workspaces(id) ON DELETE CASCADE,
  network TEXT NOT NULL CHECK (network IN ('instagram', 'tiktok', 'linkedin')),
  account_id TEXT NOT NULL,
  username TEXT,
  display_name TEXT,
  avatar_url TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  connected_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id, network)
);

-- Workspace goals
CREATE TABLE IF NOT EXISTS alfred.workspace_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES alfred.workspaces(id) ON DELETE CASCADE,
  network TEXT CHECK (network IS NULL OR network IN ('instagram', 'tiktok', 'linkedin')),
  metric TEXT NOT NULL CHECK (metric IN ('followers', 'engagement_rate', 'reach', 'posts_per_week')),
  current_value NUMERIC,
  target_value NUMERIC NOT NULL,
  deadline DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Agent conversations
CREATE TABLE IF NOT EXISTS alfred.agent_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES alfred.workspaces(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  tool_calls JSONB,
  agent_mode TEXT CHECK (agent_mode IS NULL OR agent_mode IN ('advisory', 'execution')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Daily tasks
CREATE TABLE IF NOT EXISTS alfred.daily_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES alfred.workspaces(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  type TEXT NOT NULL CHECK (type IN ('PUBLICAR', 'RESPONDER', 'ANALIZAR', 'OPTIMIZAR', 'CRECER')),
  title TEXT NOT NULL,
  description TEXT,
  network TEXT CHECK (network IS NULL OR network IN ('instagram', 'tiktok', 'linkedin')),
  priority INTEGER CHECK (priority IS NULL OR (priority BETWEEN 1 AND 5)),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'done', 'skipped')),
  agent_generated BOOLEAN DEFAULT true,
  goal_id UUID REFERENCES alfred.workspace_goals(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Content posts
CREATE TABLE IF NOT EXISTS alfred.content_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES alfred.workspaces(id) ON DELETE CASCADE,
  caption TEXT,
  media_urls TEXT[],
  media_type TEXT CHECK (media_type IS NULL OR media_type IN ('image', 'video', 'carousel', 'text')),
  scheduled_at TIMESTAMPTZ,
  networks TEXT[] NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'failed')),
  published_at TIMESTAMPTZ,
  external_ids JSONB,
  metrics_snapshot JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Analytics snapshots
CREATE TABLE IF NOT EXISTS alfred.analytics_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES alfred.workspaces(id) ON DELETE CASCADE,
  network TEXT NOT NULL CHECK (network IN ('instagram', 'tiktok', 'linkedin')),
  metric_name TEXT NOT NULL CHECK (metric_name IN ('followers', 'likes', 'comments', 'shares', 'reach', 'impressions', 'engagement_rate')),
  value NUMERIC NOT NULL,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  recorded_at TIMESTAMPTZ DEFAULT now()
);

-- =====================
-- RLS
-- =====================

ALTER TABLE alfred.workspaces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "alfred_workspaces_select" ON alfred.workspaces
  FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "alfred_workspaces_insert" ON alfred.workspaces
  FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "alfred_workspaces_update" ON alfred.workspaces
  FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "alfred_workspaces_delete" ON alfred.workspaces
  FOR DELETE USING (auth.uid() = owner_id);

ALTER TABLE alfred.social_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "alfred_social_accounts_all" ON alfred.social_accounts
  FOR ALL USING (
    workspace_id IN (SELECT id FROM alfred.workspaces WHERE owner_id = auth.uid())
  );

ALTER TABLE alfred.workspace_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "alfred_workspace_goals_all" ON alfred.workspace_goals
  FOR ALL USING (
    workspace_id IN (SELECT id FROM alfred.workspaces WHERE owner_id = auth.uid())
  );

ALTER TABLE alfred.agent_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "alfred_agent_conversations_all" ON alfred.agent_conversations
  FOR ALL USING (
    workspace_id IN (SELECT id FROM alfred.workspaces WHERE owner_id = auth.uid())
  );

ALTER TABLE alfred.daily_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "alfred_daily_tasks_all" ON alfred.daily_tasks
  FOR ALL USING (
    workspace_id IN (SELECT id FROM alfred.workspaces WHERE owner_id = auth.uid())
  );

ALTER TABLE alfred.content_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "alfred_content_posts_all" ON alfred.content_posts
  FOR ALL USING (
    workspace_id IN (SELECT id FROM alfred.workspaces WHERE owner_id = auth.uid())
  );

ALTER TABLE alfred.analytics_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "alfred_analytics_snapshots_all" ON alfred.analytics_snapshots
  FOR ALL USING (
    workspace_id IN (SELECT id FROM alfred.workspaces WHERE owner_id = auth.uid())
  );

-- =====================
-- INDEXES
-- =====================

CREATE INDEX IF NOT EXISTS idx_alfred_social_accounts_workspace ON alfred.social_accounts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_alfred_workspace_goals_active ON alfred.workspace_goals(workspace_id, is_active);
CREATE INDEX IF NOT EXISTS idx_alfred_agent_conversations_workspace ON alfred.agent_conversations(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alfred_daily_tasks_workspace_date ON alfred.daily_tasks(workspace_id, date);
CREATE INDEX IF NOT EXISTS idx_alfred_daily_tasks_status ON alfred.daily_tasks(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_alfred_content_posts_workspace ON alfred.content_posts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_alfred_analytics_snapshots_workspace ON alfred.analytics_snapshots(workspace_id, network, recorded_at DESC);

-- =====================
-- FUNCTIONS
-- =====================

CREATE OR REPLACE FUNCTION alfred.get_agent_context(p_workspace_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'connected_networks', (
      SELECT COALESCE(json_agg(DISTINCT network), '[]'::json)
      FROM alfred.social_accounts
      WHERE workspace_id = p_workspace_id AND is_active = true
    ),
    'goals', (
      SELECT COALESCE(json_agg(json_build_object(
        'id', id, 'network', network, 'metric', metric,
        'current_value', current_value, 'target_value', target_value,
        'deadline', deadline
      )), '[]'::json)
      FROM alfred.workspace_goals
      WHERE workspace_id = p_workspace_id AND is_active = true
    ),
    'pending_tasks', (
      SELECT COALESCE(json_agg(json_build_object(
        'id', id, 'type', type, 'title', title, 'description', description,
        'network', network, 'priority', priority, 'status', status
      )), '[]'::json)
      FROM alfred.daily_tasks
      WHERE workspace_id = p_workspace_id AND date = CURRENT_DATE AND status = 'pending'
    ),
    'recent_posts', (
      SELECT COALESCE(json_agg(json_build_object(
        'id', id, 'caption', caption, 'networks', networks,
        'status', status, 'published_at', published_at,
        'metrics_snapshot', metrics_snapshot
      ) ORDER BY created_at DESC), '[]'::json)
      FROM alfred.content_posts
      WHERE workspace_id = p_workspace_id
      LIMIT 5
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant usage to anon and authenticated roles
GRANT USAGE ON SCHEMA alfred TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA alfred TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA alfred TO anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA alfred TO authenticated, anon;

-- Make future tables automatically accessible
ALTER DEFAULT PRIVILEGES IN SCHEMA alfred
  GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA alfred
  GRANT SELECT ON TABLES TO anon;
