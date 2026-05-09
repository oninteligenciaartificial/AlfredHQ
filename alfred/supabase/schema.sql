-- Alfred Database Schema
-- Multi-tenant SaaS with RLS on all tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Workspaces
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID REFERENCES auth.users(id),
  plan TEXT DEFAULT 'internal' CHECK (plan IN ('internal', 'starter', 'pro')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Social accounts
CREATE TABLE social_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  network TEXT NOT NULL CHECK (network IN ('instagram', 'tiktok', 'linkedin')),
  account_id TEXT NOT NULL,
  username TEXT,
  display_name TEXT,
  avatar_url TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  connected_at TIMESTAMPTZ DEFAULT now()
);

-- Workspace goals
CREATE TABLE workspace_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  network TEXT CHECK (network IS NULL OR network IN ('instagram', 'tiktok', 'linkedin')),
  metric TEXT NOT NULL CHECK (metric IN ('followers', 'engagement_rate', 'reach', 'posts_per_week')),
  current_value NUMERIC,
  target_value NUMERIC NOT NULL,
  deadline DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Agent conversations
CREATE TABLE agent_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  tool_calls JSONB,
  agent_mode TEXT CHECK (agent_mode IS NULL OR agent_mode IN ('advisory', 'execution')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Daily tasks
CREATE TABLE daily_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  type TEXT NOT NULL CHECK (type IN ('PUBLICAR', 'RESPONDER', 'ANALIZAR', 'OPTIMIZAR', 'CRECER')),
  title TEXT NOT NULL,
  description TEXT,
  network TEXT CHECK (network IS NULL OR network IN ('instagram', 'tiktok', 'linkedin')),
  priority INTEGER CHECK (priority IS NULL OR (priority BETWEEN 1 AND 5)),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'done', 'skipped')),
  agent_generated BOOLEAN DEFAULT true,
  goal_id UUID REFERENCES workspace_goals(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Content posts
CREATE TABLE content_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
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
CREATE TABLE analytics_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  network TEXT NOT NULL CHECK (network IN ('instagram', 'tiktok', 'linkedin')),
  metric_name TEXT NOT NULL CHECK (metric_name IN ('followers', 'likes', 'comments', 'shares', 'reach', 'impressions', 'engagement_rate')),
  value NUMERIC NOT NULL,
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  recorded_at TIMESTAMPTZ DEFAULT now()
);

-- RLS Policies

-- Workspaces: users can only see their own
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own workspaces" ON workspaces
  FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Users can create own workspaces" ON workspaces
  FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can update own workspaces" ON workspaces
  FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Users can delete own workspaces" ON workspaces
  FOR DELETE USING (auth.uid() = owner_id);

-- Social accounts: filter by workspace ownership
ALTER TABLE social_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view workspace social accounts" ON social_accounts
  FOR SELECT USING (
    workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
  );
CREATE POLICY "Users can insert workspace social accounts" ON social_accounts
  FOR INSERT WITH CHECK (
    workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
  );
CREATE POLICY "Users can update workspace social accounts" ON social_accounts
  FOR UPDATE USING (
    workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
  );
CREATE POLICY "Users can delete workspace social accounts" ON social_accounts
  FOR DELETE USING (
    workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
  );

-- Workspace goals
ALTER TABLE workspace_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view workspace goals" ON workspace_goals
  FOR SELECT USING (
    workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
  );
CREATE POLICY "Users can manage workspace goals" ON workspace_goals
  FOR ALL USING (
    workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
  );

-- Agent conversations
ALTER TABLE agent_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view workspace conversations" ON agent_conversations
  FOR SELECT USING (
    workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
  );
CREATE POLICY "Users can manage workspace conversations" ON agent_conversations
  FOR ALL USING (
    workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
  );

-- Daily tasks
ALTER TABLE daily_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view workspace tasks" ON daily_tasks
  FOR SELECT USING (
    workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
  );
CREATE POLICY "Users can manage workspace tasks" ON daily_tasks
  FOR ALL USING (
    workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
  );

-- Content posts
ALTER TABLE content_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view workspace posts" ON content_posts
  FOR SELECT USING (
    workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
  );
CREATE POLICY "Users can manage workspace posts" ON content_posts
  FOR ALL USING (
    workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
  );

-- Analytics snapshots
ALTER TABLE analytics_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view workspace analytics" ON analytics_snapshots
  FOR SELECT USING (
    workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
  );
CREATE POLICY "Users can manage workspace analytics" ON analytics_snapshots
  FOR ALL USING (
    workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
  );

-- Indexes for performance
CREATE INDEX idx_social_accounts_workspace ON social_accounts(workspace_id);
CREATE INDEX idx_social_accounts_network ON social_accounts(network);
CREATE INDEX idx_workspace_goals_workspace ON workspace_goals(workspace_id);
CREATE INDEX idx_workspace_goals_active ON workspace_goals(workspace_id, is_active);
CREATE INDEX idx_agent_conversations_workspace ON agent_conversations(workspace_id, created_at DESC);
CREATE INDEX idx_daily_tasks_workspace_date ON daily_tasks(workspace_id, date);
CREATE INDEX idx_daily_tasks_status ON daily_tasks(workspace_id, status);
CREATE INDEX idx_content_posts_workspace ON content_posts(workspace_id);
CREATE INDEX idx_content_posts_scheduled ON content_posts(status, scheduled_at) WHERE status = 'scheduled';
CREATE INDEX idx_analytics_snapshots_workspace ON analytics_snapshots(workspace_id, network, recorded_at DESC);

-- Function: get agent context (single query optimization)
CREATE OR REPLACE FUNCTION get_agent_context(p_workspace_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'connected_networks', (
      SELECT COALESCE(json_agg(DISTINCT network), '[]'::json)
      FROM social_accounts
      WHERE workspace_id = p_workspace_id AND is_active = true
    ),
    'goals', (
      SELECT COALESCE(json_agg(json_build_object(
        'id', id, 'network', network, 'metric', metric,
        'current_value', current_value, 'target_value', target_value,
        'deadline', deadline
      )), '[]'::json)
      FROM workspace_goals
      WHERE workspace_id = p_workspace_id AND is_active = true
    ),
    'pending_tasks', (
      SELECT COALESCE(json_agg(json_build_object(
        'id', id, 'type', type, 'title', title, 'description', description,
        'network', network, 'priority', priority, 'status', status
      )), '[]'::json)
      FROM daily_tasks
      WHERE workspace_id = p_workspace_id AND date = CURRENT_DATE AND status = 'pending'
    ),
    'recent_posts', (
      SELECT COALESCE(json_agg(json_build_object(
        'id', id, 'caption', caption, 'networks', networks,
        'status', status, 'published_at', published_at,
        'metrics_snapshot', metrics_snapshot
      ) ORDER BY created_at DESC), '[]'::json)
      FROM content_posts
      WHERE workspace_id = p_workspace_id
      LIMIT 5
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
