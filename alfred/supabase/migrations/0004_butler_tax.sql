CREATE TABLE tax_obligations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  tax_type TEXT NOT NULL CHECK (tax_type IN ('IVA','IT','RC_IVA','IUE','IEHD')),
  period TEXT NOT NULL,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming','due_soon','overdue','filed')),
  filed_at TIMESTAMPTZ,
  filed_amount NUMERIC,
  reminder_sent_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(business_id, tax_type, period)
);

ALTER TABLE tax_obligations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_isolation" ON tax_obligations
  USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

CREATE INDEX idx_tax_workspace_status ON tax_obligations(workspace_id, status, due_date);
