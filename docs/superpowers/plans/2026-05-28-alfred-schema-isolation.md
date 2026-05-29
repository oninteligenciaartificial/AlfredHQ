# Alfred — Schema Isolation in DentaGest Supabase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Run Alfred completely isolated inside DentaGest's Supabase project using a dedicated `alfred` PostgreSQL schema, with zero interference with DentaGest's `public` schema, until a separate Supabase project is provisioned.

**Architecture:** All Alfred tables live in a `alfred` PostgreSQL schema (not `public`). The Supabase JS client is configured with `db: { schema: 'alfred' }` so every `.from()` call targets the `alfred` schema automatically. DentaGest continues using the `public` schema unchanged. Migration to a separate project later requires only changing the Supabase URL/keys — no code changes.

**Tech Stack:** Next.js 16, TypeScript, `@supabase/ssr ^0.10.3`, `@supabase/supabase-js ^2.105.4`, PostgreSQL 17 (Supabase)

**Project paths:**
- App code: `C:\dev\proyectos\AlfredHQ\.claude\worktrees\unruffled-williams-f4a226\alfred\`
- Schema SQL: `C:\dev\proyectos\AlfredHQ\.claude\worktrees\unruffled-williams-f4a226\alfred\supabase\`
- Supabase project: `kvepqgikokjlacxngkiw` (DentaGest — shared temporarily)

---

## Context for Engineers

### Why a separate schema?

DentaGest uses the `public` schema with 22 tables. Alfred needs 7 new tables. Mixing them would:
- Create naming conflicts (`audit_logs` exists in both)
- Make future migration harder
- Risk RLS policy interference

Using `alfred` schema gives complete isolation. Both apps share Supabase Auth (`auth.users`) — same user table, same magic link auth. Alfred users can be DentaGest users too.

### How Supabase schema routing works

Supabase exposes schemas via PostgREST. By default only `public` is exposed. To expose `alfred`:
1. Go to Supabase Dashboard → Settings → API
2. Under "Exposed schemas" add `alfred`
3. Save

Then configure the JS client:
```typescript
createServerClient<Database, 'alfred'>(url, key, {
  db: { schema: 'alfred' },
  cookies: { ... }
})
```

The `Database` type must key on `'alfred'` instead of `'public'`.

### RLS in custom schemas

RLS policies in `alfred` schema work identically to `public`. `auth.uid()` is always available. Foreign keys can reference `auth.users` cross-schema.

---

## File Map

| File | Action | What changes |
|------|--------|-------------|
| `supabase/schema-alfred.sql` | **Create** | Full schema with `alfred` prefix — replaces `schema.sql` for this deploy |
| `src/types/database.types.ts` | **Modify** | Change `public:` key to `alfred:` |
| `src/lib/supabase/server.ts` | **Modify** | Add `db: { schema: 'alfred' }` + update generic type param |
| `src/lib/supabase/client.ts` | **Modify** | Add `db: { schema: 'alfred' }` + update generic type param |
| `supabase/MIGRATION_NOTES.md` | **Create** | Document what to do when moving to dedicated Supabase project |

---

## Task 1: Create alfred-schema SQL file

**Files:**
- Create: `supabase/schema-alfred.sql`

- [ ] **Step 1: Create the file**

Create `C:\dev\proyectos\AlfredHQ\.claude\worktrees\unruffled-williams-f4a226\alfred\supabase\schema-alfred.sql` with this exact content:

```sql
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
```

- [ ] **Step 2: Commit**

```bash
git add supabase/schema-alfred.sql
git commit -m "feat(db): add alfred schema SQL for DentaGest shared deployment"
```

---

## Task 2: Expose alfred schema in Supabase Dashboard

This step is manual — cannot be done via SQL.

- [ ] **Step 1: Open Supabase dashboard**

Go to: https://supabase.com/dashboard/project/kvepqgikokjlacxngkiw/settings/api

- [ ] **Step 2: Add alfred to exposed schemas**

Find "Exposed schemas" section (under "Data API" settings).
Add `alfred` to the list (alongside `public`).
Click Save.

> **Why:** PostgREST (Supabase's API layer) only exposes schemas explicitly listed here. Without this, the JS client can't query `alfred` tables — all requests return 404.

- [ ] **Step 3: Verify in SQL Editor**

Run this in Supabase SQL Editor to confirm tables are visible:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'alfred';
```
Expected: 7 rows (workspaces, social_accounts, workspace_goals, agent_conversations, daily_tasks, content_posts, analytics_snapshots)

---

## Task 3: Apply schema via Supabase SQL Editor

- [ ] **Step 1: Open SQL Editor**

Go to: https://supabase.com/dashboard/project/kvepqgikokjlacxngkiw/sql/new

- [ ] **Step 2: Paste and run schema-alfred.sql**

Copy the full contents of `supabase/schema-alfred.sql` and run it.

Expected: No errors. All statements succeed.

If you see `already exists` errors — safe to ignore (idempotent `IF NOT EXISTS` used everywhere).

- [ ] **Step 3: Verify tables exist**

```sql
SELECT table_name, schemaname
FROM information_schema.tables
WHERE table_schema = 'alfred'
ORDER BY table_name;
```

Expected output:
```
agent_conversations  | alfred
analytics_snapshots  | alfred
content_posts        | alfred
daily_tasks          | alfred
social_accounts      | alfred
workspace_goals      | alfred
workspaces           | alfred
```

- [ ] **Step 4: Verify RLS is enabled**

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'alfred';
```

Expected: `rowsecurity = true` for all 7 tables.

---

## Task 4: Update TypeScript database types

**Files:**
- Modify: `src/types/database.types.ts`

- [ ] **Step 1: Change the schema key from `public` to `alfred`**

In `src/types/database.types.ts`, change line 9:

```typescript
// BEFORE:
export type Database = {
  public: {

// AFTER:
export type Database = {
  alfred: {
```

That single change cascades through all TypeScript — the Database type now describes the `alfred` schema.

- [ ] **Step 2: Update the Functions section**

The `get_agent_context` function now lives in `alfred` schema. Update line ~311:

```typescript
// BEFORE:
    Functions: {
      get_agent_context: {
        Args: { p_workspace_id: string }
        Returns: Json
      }
    }

// AFTER:
    Functions: {
      get_agent_context: {
        Args: { p_workspace_id: string }
        Returns: Json
      }
    }
```

(No change needed to the type itself — Supabase resolves functions by name within the exposed schema.)

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd C:\dev\proyectos\AlfredHQ\.claude\worktrees\unruffled-williams-f4a226\alfred
npx tsc --noEmit
```

Expected: No errors (the `any` casts from the build-error-resolver session absorb any remaining issues).

- [ ] **Step 4: Commit**

```bash
git add src/types/database.types.ts
git commit -m "feat(types): point Database type at alfred schema"
```

---

## Task 5: Update Supabase clients to use alfred schema

**Files:**
- Modify: `src/lib/supabase/server.ts`
- Modify: `src/lib/supabase/client.ts`

- [ ] **Step 1: Update server client**

Replace the full content of `src/lib/supabase/server.ts`:

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database.types'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database, 'alfred'>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: { schema: 'alfred' },
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // In Server Components, cookies are read-only
          }
        },
      },
    }
  )
}

export async function createAdminClient() {
  const cookieStore = await cookies()

  return createServerClient<Database, 'alfred'>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      db: { schema: 'alfred' },
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // In Server Components, cookies are read-only
          }
        },
      },
    }
  )
}
```

- [ ] **Step 2: Update browser client**

Replace the full content of `src/lib/supabase/client.ts`:

```typescript
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database.types'

export function createClient() {
  return createBrowserClient<Database, 'alfred'>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: { schema: 'alfred' },
    }
  )
}
```

- [ ] **Step 3: Build to verify**

```bash
cd C:\dev\proyectos\AlfredHQ\.claude\worktrees\unruffled-williams-f4a226\alfred
npx next build
```

Expected: Build succeeds. Any remaining `never` type errors → add `as any` cast (same pattern as prior session).

- [ ] **Step 4: Commit**

```bash
git add src/lib/supabase/server.ts src/lib/supabase/client.ts
git commit -m "feat(supabase): configure clients to use alfred schema"
```

---

## Task 6: Create migration notes document

**Files:**
- Create: `supabase/MIGRATION_NOTES.md`

- [ ] **Step 1: Create the file**

Create `C:\dev\proyectos\AlfredHQ\.claude\worktrees\unruffled-williams-f4a226\alfred\supabase\MIGRATION_NOTES.md`:

```markdown
# Alfred Database Migration Notes

## Current Setup (Temporary)

Alfred runs in the **DentaGest Supabase project** (`kvepqgikokjlacxngkiw`) using the `alfred` schema.
DentaGest uses the `public` schema — there is zero overlap.

## When to Migrate

Migrate when:
- Supabase Pro plan is purchased, OR
- DentaGest DB approaches 400MB (80% of 500MB free limit), OR
- Alfred has paying customers (needs SLA isolation)

## How to Migrate (15-minute process)

1. **Create new Supabase project** (any region)
2. **Apply schema** — run `supabase/schema-alfred.sql` in new project's SQL Editor
3. **Export data** (if any prod data exists):
   ```sql
   -- Run in current project, save output
   SELECT * FROM alfred.workspaces;
   SELECT * FROM alfred.social_accounts;
   -- etc for all 7 tables
   ```
4. **Import data** — paste INSERT statements in new project
5. **Update env vars** in Vercel/deployment:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://NEWPROJECT.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=new_anon_key
   SUPABASE_SERVICE_ROLE_KEY=new_service_role_key
   ```
6. **Expose alfred schema** in new project's Settings → API → Exposed schemas
7. **Deploy** — zero code changes needed

## What Does NOT Need to Change

- Zero application code changes
- Zero TypeScript changes  
- `schema-alfred.sql` works identically on any Supabase project
- Auth users don't migrate (users re-register on new project) — acceptable for early stage

## DB Size Monitoring

Check current usage:
```sql
SELECT
  schemaname,
  pg_size_pretty(sum(pg_total_relation_size(schemaname||'.'||tablename))) AS total_size
FROM pg_tables
WHERE schemaname IN ('public', 'alfred')
GROUP BY schemaname;
```

Alert threshold: migrate when `alfred` schema exceeds 100MB.
```

- [ ] **Step 2: Commit**

```bash
git add supabase/MIGRATION_NOTES.md
git commit -m "docs(db): add migration notes for alfred schema"
```

---

## Task 7: End-to-end smoke test

Prerequisites: `.env.local` filled with Supabase URL + anon key, ANTHROPIC_API_KEY set.

- [ ] **Step 1: Start dev server**

```bash
cd C:\dev\proyectos\AlfredHQ\.claude\worktrees\unruffled-williams-f4a226\alfred
npm run dev
```

Expected: Server starts on `http://localhost:3000`

- [ ] **Step 2: Test auth**

Open `http://localhost:3000/login`
Enter your email → click "Enviar magic link"
Expected: "Revisa tu email para el magic link" message appears

- [ ] **Step 3: Verify workspace auto-creation**

After clicking magic link and landing on `/dashboard`:
Go to Supabase SQL Editor and run:
```sql
SELECT * FROM alfred.workspaces;
```
Expected: 1 row with your user's `owner_id`

- [ ] **Step 4: Test agent chat**

Go to `/agent` → type "Hola Alfred, ¿qué puedo hacer hoy?"
Expected: Streaming response from Claude API

- [ ] **Step 5: Test task creation**

Go to `/tasks` → click "Nueva tarea" → fill form → save
Go to SQL Editor: `SELECT * FROM alfred.daily_tasks;`
Expected: Row appears in DB

- [ ] **Step 6: Verify no DentaGest interference**

```sql
-- Verify DentaGest public schema untouched
SELECT count(*) FROM public.appointments;
SELECT count(*) FROM public.patients;
```
Expected: Same row counts as before (16 appointments, 17 patients)

---

## Summary

| Task | Estimated Time | Manual? |
|------|---------------|---------|
| 1. Create schema-alfred.sql | 1 min (automated) | No |
| 2. Expose schema in Dashboard | 2 min | **Yes** |
| 3. Apply SQL in Dashboard | 3 min | **Yes** |
| 4. Update database.types.ts | 1 min (automated) | No |
| 5. Update Supabase clients | 2 min (automated) | No |
| 6. Create migration notes | 1 min (automated) | No |
| 7. Smoke test | 5 min | **Yes** |

**Total: ~15 minutes, 3 manual steps (Tasks 2, 3, 7)**
