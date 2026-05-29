CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
  concept TEXT NOT NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'BOB',
  payer_name TEXT,
  method TEXT CHECK (method IN ('efectivo','transferencia','qr','tarjeta','otro')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','refunded','cancelled')),
  external_ref TEXT,
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual','api','qr','dentagest')),
  notes TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(workspace_id, source, external_ref)
);

-- RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workspace_isolation" ON payments
  USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

-- Indexes
CREATE INDEX idx_payments_workspace ON payments(workspace_id);
CREATE INDEX idx_payments_workspace_status ON payments(workspace_id, status, created_at DESC);
CREATE INDEX idx_payments_workspace_paid_at ON payments(workspace_id, paid_at DESC);
