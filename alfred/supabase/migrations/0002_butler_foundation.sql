-- Migration: Butler Foundation Tables
-- Creates businesses, notification_channels, api_keys with full RLS

-- ============================================================
-- BUSINESSES
-- ============================================================
CREATE TABLE businesses (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  nit          TEXT,
  tax_regime   TEXT CHECK (tax_regime IN ('general', 'simplificado', 'rc_iva')),
  currency     TEXT NOT NULL DEFAULT 'BOB',
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_businesses_workspace_id ON businesses(workspace_id);

ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;

CREATE POLICY businesses_select ON businesses
  FOR SELECT USING (
    workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
  );

CREATE POLICY businesses_insert ON businesses
  FOR INSERT WITH CHECK (
    workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
  );

CREATE POLICY businesses_update ON businesses
  FOR UPDATE USING (
    workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
  );

CREATE POLICY businesses_delete ON businesses
  FOR DELETE USING (
    workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
  );

-- ============================================================
-- NOTIFICATION CHANNELS
-- ============================================================
CREATE TABLE notification_channels (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  type         TEXT NOT NULL CHECK (type IN ('telegram', 'discord', 'whatsapp')),
  target       TEXT NOT NULL,
  label        TEXT NOT NULL DEFAULT '',
  is_active    BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notification_channels_workspace_id ON notification_channels(workspace_id);

ALTER TABLE notification_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY notification_channels_select ON notification_channels
  FOR SELECT USING (
    workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
  );

CREATE POLICY notification_channels_insert ON notification_channels
  FOR INSERT WITH CHECK (
    workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
  );

CREATE POLICY notification_channels_update ON notification_channels
  FOR UPDATE USING (
    workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
  );

CREATE POLICY notification_channels_delete ON notification_channels
  FOR DELETE USING (
    workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
  );

-- ============================================================
-- API KEYS
-- ============================================================
CREATE TABLE api_keys (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  key_prefix   TEXT NOT NULL,
  key_hash     TEXT NOT NULL UNIQUE,
  scopes       TEXT[] NOT NULL DEFAULT '{payments:read,payments:write}',
  last_used_at TIMESTAMPTZ,
  revoked_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_api_keys_workspace_id ON api_keys(workspace_id);

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY api_keys_select ON api_keys
  FOR SELECT USING (
    workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
  );

CREATE POLICY api_keys_insert ON api_keys
  FOR INSERT WITH CHECK (
    workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
  );

CREATE POLICY api_keys_update ON api_keys
  FOR UPDATE USING (
    workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
  );

CREATE POLICY api_keys_delete ON api_keys
  FOR DELETE USING (
    workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
  );
