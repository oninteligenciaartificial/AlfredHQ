# Alfred — Architecture

> Status: Placeholder — to be expanded as the system is built.

---

## Overview

Alfred is a multi-tenant SaaS built on Next.js 15 (App Router) with Supabase as the primary backend. The system has three main concerns:

1. **Web application** — Next.js frontend + API routes
2. **AI agent** — Claude API with tool use, streaming responses
3. **Automation layer** — n8n workflows for scheduled sync and publishing

---

## High-Level Diagram

```
Browser
  └── Next.js 15 (Vercel)
        ├── App Router (RSC + Client Components)
        ├── API Routes
        │     ├── /api/agent/chat         ← Claude API (streaming)
        │     ├── /api/agent/tasks/generate ← n8n cron trigger
        │     ├── /api/social/callback/*  ← OAuth flows
        │     ├── /api/social/webhook     ← Meta webhooks
        │     ├── /api/sync/analytics     ← n8n trigger
        │     └── /api/posts/publish      ← n8n trigger
        └── Supabase Client (browser)
              ├── Auth (magic link + OAuth)
              ├── Realtime subscriptions
              └── Signed URL generation

Supabase (PostgreSQL + RLS)
  ├── workspaces
  ├── social_accounts (tokens in Vault)
  ├── workspace_goals
  ├── agent_conversations
  ├── daily_tasks
  ├── content_posts
  └── analytics_snapshots

n8n (automation)
  ├── Cron: generate daily tasks → 7:00 AM → /api/agent/tasks/generate
  ├── Cron: sync analytics → every 6h → social APIs → analytics_snapshots
  └── Cron: publish scheduled posts → every 5 min → /api/posts/publish

Social APIs
  ├── Meta Graph API v20+ (Instagram)
  ├── TikTok Content Posting API v2
  └── LinkedIn API v2
```

---

## Authentication

- Supabase Auth with magic link (primary) and OAuth (Google, future)
- Next.js middleware protects all `/dashboard/*` routes
- Row Level Security on all tables: every policy checks `workspace_id` ownership

## Multi-tenancy

- Tenant = `workspace`
- Users can belong to multiple workspaces (workspace_members table, planned for v2)
- All data queries include `workspace_id` filter enforced by RLS

## Agent Architecture

See `CLAUDE.md` for the full agent specification including system prompt, tools, and context injection pattern.

## State Management

| Concern | Tool |
|---|---|
| Server/async state | TanStack Query |
| Client UI state | Zustand |
| URL state | Next.js search params |
| Form state | React Hook Form |

---

## To Be Documented

- [ ] OAuth flow sequence diagrams
- [ ] n8n workflow exports
- [ ] Supabase RLS policies
- [ ] Agent context building (RPC/view design)
- [ ] Video upload flow (Supabase Storage + Meta resumable)
- [ ] Webhook verification (Meta signature check)
