# Alfred — Claude Code Project Context

> Version: 1.0 | Owner: OnIA | Working dir: `alfred/`

---

## Product Vision

**Alfred** is a social media management SaaS with an integrated AI agent — a digital butler for your brand. It centralizes Instagram, TikTok, and LinkedIn in a single workspace with an agent that generates daily tasks based on metrics and user goals, answers strategic questions, and can execute actions (publish, schedule, reply to comments) depending on the chosen mode.

**Business model:** Internal OnIA use first → scale as a sellable multi-tenant product from day one.

> LEGAL NOTE: The name "Alfred" is used by meetAlfred.com. Risk is low while operating exclusively in Bolivia/LATAM. Register with SENAPI before commercial launch.

---

## Tech Stack (non-negotiable)

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router) + TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Database + Auth | Supabase (PostgreSQL + Auth + Storage + Realtime) |
| AI Agent | Claude API — `claude-sonnet-4-20250514` with tool use |
| Automation | n8n (cron jobs + sync workflows) |
| Client state | Zustand |
| Server state | TanStack Query (React Query) |
| Deploy | Vercel |

---

## Key Concepts

### Multi-tenant Architecture

- Every resource is scoped to a `workspace_id`
- RLS enabled on all Supabase tables — every query filters by `workspace_id`
- One user can belong to multiple workspaces (future: team roles)

### AI Agent Modes

- **Advisory** — agent recommends and analyzes only, no tool execution
- **Execution** — agent can call tools: `schedule_post`, `create_draft`, `get_analytics`, `complete_task`, `reply_comment`, `generate_content_ideas`

### Social API Constraints

| Network | DMs | Rate Limit | Notes |
|---|---|---|---|
| Instagram | Yes (pending Meta approval) | 200 calls/hr | Requires Business/Creator + Facebook Page |
| TikTok | No public API | 1000 calls/day | Requires +1000 followers for posting API |
| LinkedIn | Partners only | 500 calls/day | Requires Company Page |

**Rule:** Never call social APIs in real-time from the frontend. Always read cached data from Supabase (updated by n8n every 6h).

### Agent Context Injection

Every `/api/agent/chat` call injects:
- Active goals + progress
- Last 7 days of analytics snapshots
- Today's pending tasks
- Last 5 posts with metrics snapshot

`buildAgentContext()` must use at most 3 Supabase queries (use RPC or materialized views).

---

## Project Structure

```
alfred/
  src/
    app/
      (auth)/login/          # Magic link + OAuth
      (dashboard)/           # Main layout with sidebar
        dashboard/           # Daily view: tasks + agent summary + key metrics
        agent/               # Full chat with AI agent
        tasks/               # Daily task management
        planner/             # Content calendar + post editor
        analytics/           # Unified metrics with charts
        settings/
          accounts/          # Connect/disconnect social networks
          goals/             # Define goals per network
          workspace/         # Name, plan, general config
          billing/           # Plan management
    api/
      agent/chat/            # POST: Claude API call with tool use + streaming
      agent/tasks/generate/  # POST: generate daily tasks (called by n8n at 7AM)
      social/callback/[net]/ # OAuth callbacks
      social/webhook/        # Meta webhooks (comments, DMs)
      sync/analytics/        # POST: sync metrics (called by n8n every 6h)
      posts/publish/         # POST: publish scheduled post (called by n8n)
    components/              # Shared UI components
    hooks/                   # Custom React hooks
    lib/                     # Utilities, Supabase client, API helpers
    types/                   # TypeScript types and interfaces
    middleware.ts            # Auth middleware (protect dashboard routes)
```

---

## Database Tables

- `workspaces` — tenant root
- `social_accounts` — connected network accounts (tokens encrypted via Supabase Vault)
- `workspace_goals` — metric targets per network
- `agent_conversations` — chat history with tool_calls JSONB
- `daily_tasks` — agent-generated and manual tasks
- `content_posts` — drafts, scheduled, and published posts
- `analytics_snapshots` — time-series metrics cached from social APIs

---

## Critical Technical Rules

1. **Access tokens** — store encrypted with Supabase Vault, never in env vars per user
2. **Video storage** — Supabase Storage private bucket, use signed URLs for upload and preview
3. **Agent streaming** — use `stream: true` in Claude API + `ReadableStream` in Next.js route handler
4. **Instagram DMs** — implement full UI/logic, show "Requires Meta approval" banner until approved
5. **TikTok DMs** — do not implement (no public API exists)
6. **No real-time social API calls from frontend** — always use Supabase cached data

---

## Development Phases

See `docs/ROADMAP.md` for full phase breakdown.

Current focus: **MVP v1 (internal OnIA use)**

---

## Environment Variables

See `.env.example` for all required variables.

---

## Suggested Domains

`heyalfred.io` / `alfred.social` / `useralfred.com`
(`alfred.app` and `meetalfred.com` are taken)
