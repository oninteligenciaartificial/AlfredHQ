# AlfredHQ — App Status Audit

**Date:** 2026-05-28
**Stack:** Next.js 15, Supabase, TypeScript, Anthropic Claude API
**Auditor:** Automated audit via Claude Code

---

## 1. Pages Audit — `src/app/(dashboard)/`

| Route | File | Status | Notes |
|-------|------|--------|-------|
| `/dashboard` | `dashboard/page.tsx` | ✅ Working | Server component, reads real Supabase data (payments, taxes, todos, summary stats) |
| `/agent` | `agent/page.tsx` | ✅ Working | Client component, calls `/api/agent/chat` with real Anthropic SDK, supports advisory/autonomous modes |
| `/planner` | `planner/page.tsx` | ✅ Working | Client component, reads `content_posts` from Supabase; calendar UI with create/edit modal |
| `/analytics` | `analytics/page.tsx` | ⚠️ Placeholder | Client component; fetches from `analytics_snapshots` table, but sync fills it with **random mock data** (see `/api/sync/analytics`) |
| `/tasks` | `tasks/page.tsx` | ✅ Working | Client component, uses `useTasks` hook, reads `daily_tasks` from Supabase |
| `/alerts` | `alerts/page.tsx` | ✅ Working | Server component, reads `notification_channels` table |
| `/calendar` | `calendar/page.tsx` | ✅ Working | Server component, reads `tax_obligations` and `businesses` tables |
| `/notes` | `notes/page.tsx` | ✅ Working | Server component, reads `notes` + `todos` tables |
| `/payments` | `payments/page.tsx` | ✅ Working | Client component, uses payments repository, CRUD operations |
| `/settings` | `settings/` (index missing) | ❌ Missing | No `settings/page.tsx` index — navigating to `/settings` would 404 |
| `/settings/accounts` | `settings/accounts/page.tsx` | ⚠️ Incomplete | Social OAuth connect uses **mock flow** by default; real OAuth only works if `META_APP_ID`, `META_APP_SECRET`, `LINKEDIN_CLIENT_ID`, etc. are set in env |
| `/settings/billing` | `settings/billing/page.tsx` | ⚠️ Placeholder | UI renders plans; checkout calls `/api/billing/checkout` — needs Stripe/payment keys configured |
| `/settings/goals` | `settings/goals/page.tsx` | Unknown | Not read — file exists at `settings/goals/` |
| `/settings/workspace` | `settings/workspace/page.tsx` | Unknown | Not read — file exists at `settings/workspace/` |

---

## 2. API Routes Audit — `src/app/api/`

| Route | File | Status | Notes |
|-------|------|--------|-------|
| `POST /api/agent/chat` | `agent/chat/route.ts` | ✅ Real | Anthropic SDK streaming, tool-use handlers, rate limiting, audit log |
| `GET/POST /api/agent/conversations` | `agent/conversations/` | ✅ Real | CRUD for agent_conversations table |
| `POST /api/agent/tasks` | `agent/tasks/` | ✅ Real | Daily task generation via Claude |
| `POST /api/billing/checkout` | `billing/checkout/route.ts` | ⚠️ Partial | Real Zod validation + Supabase, but payment provider integration unclear |
| `POST /api/billing/confirm` | `billing/confirm/` | Unknown | Exists, not fully read |
| `POST /api/billing/webhook` | `billing/webhook/` | Unknown | Exists, not fully read |
| `GET/POST /api/goals` | `goals/route.ts` | ✅ Real | CRUD for workspace_goals |
| `GET/POST /api/posts` | `posts/route.ts` | ✅ Real | CRUD for content_posts |
| `POST /api/posts/publish` | `posts/publish/` | Unknown | Exists; likely mock publish |
| `GET /api/social/callback/[network]` | `social/callback/[network]/route.ts` | ⚠️ Mock-first | Attempts real OAuth if env vars present; falls back to mock tokens. Not production-ready without real app credentials |
| `POST /api/social/webhook` | `social/webhook/` | Unknown | Exists, not read |
| `POST /api/sync/analytics` | `sync/analytics/route.ts` | ⚠️ Mock data | Writes random numbers into `analytics_snapshots` — no real platform API calls |
| `GET/POST /api/tasks` | `tasks/route.ts` | ✅ Real | CRUD for daily_tasks |
| `POST /api/telegram/webhook` | `telegram/webhook/route.ts` | ✅ Real | Telegram bot webhook handler, uses `sendTelegramMessage` |
| `GET/POST /api/v1/businesses` | `v1/businesses/` | ✅ Real | |
| `GET/POST /api/v1/notes` | `v1/notes/` | ✅ Real | |
| `GET/POST /api/v1/notifications` | `v1/notifications/` | ✅ Real | |
| `GET/POST /api/v1/payments` | `v1/payments/` | ✅ Real | |
| `GET/POST /api/v1/tax` | `v1/tax/` | ✅ Real | |
| `GET/POST /api/v1/todos` | `v1/todos/` | ✅ Real | |
| `GET/POST /api/workspaces` | `workspaces/route.ts` | ✅ Real | |

---

## 3. Database Schema

### Core tables (in `schema.sql`)

| Table | Purpose |
|-------|---------|
| `workspaces` | Multi-tenant workspace per user |
| `social_accounts` | Connected IG/TikTok/LinkedIn accounts (OAuth tokens, encrypted) |
| `workspace_goals` | Weekly follower/engagement goals per network |
| `agent_conversations` | Alfred chat history |
| `daily_tasks` | AI-generated daily action items |
| `content_posts` | Scheduled/published social media posts |
| `analytics_snapshots` | Periodic metric snapshots (followers, reach, etc.) |

### Additional tables (in migrations)

| Table | Migration | Purpose |
|-------|-----------|---------|
| `businesses` | `0002_butler_foundation.sql` | Business entity for tax/payments |
| `notification_channels` | `0002_butler_foundation.sql` | Telegram/email alert channels |
| `api_keys` | `0002_butler_foundation.sql` | External API keys per workspace |
| `payments` | `0003_butler_payments.sql` | Payment/income tracking (Bolivia-focused) |
| `tax_obligations` | `0004_butler_tax.sql` | Tax deadline calendar |
| `notes` | `0005_butler_notes_todos.sql` | Freeform notes |
| `todos` | `0005_butler_notes_todos.sql` | Task/todo items |

**Total: 14 tables**

---

## 4. Supabase Integration

Located in `src/lib/supabase/`:
- `client.ts` — browser-side Supabase client (createBrowserClient)
- `server.ts` — server-side Supabase client (createServerClient, reads cookies)
- `agent-context.ts` — builds agent context from workspace data
- `audit.ts` — audit log writes to Supabase

Additional lib structure confirms: `security/authorization.ts` (getCurrentUser, getUserWorkspace), rate limiting, error handling, crypto (token encryption at rest). The integration is **mature and well-structured**.

---

## 5. n8n Integration

No n8n SDK or client library is embedded in the codebase. Integration is **webhook-only** (documented in `docs/N8N_WORKFLOWS.md`):

| Workflow | Endpoint Called | Schedule |
|----------|----------------|----------|
| Daily Task Generation | `POST /api/agent/tasks/generate` | 07:00 AM daily |
| Analytics Sync | `POST /api/sync/analytics` | Every 6 hours |
| Alerts Check | `POST /api/agent/tasks/check-alerts` (inferred) | Unknown |

n8n is a **external orchestrator**, not embedded. The app exposes HTTP endpoints that n8n calls on schedule. This is intentional by design.

---

## 6. Top 5 Critical Gaps

| # | Gap | Severity | Estimated Effort |
|---|-----|----------|-----------------|
| 1 | **Analytics data is fake** — `/api/sync/analytics` writes random numbers. No real Instagram Graph API, TikTok, or LinkedIn API calls are made. Analytics page is essentially a demo. | HIGH | 3–5 days per platform (API integration + token refresh logic). ~10–15 days total for 3 platforms. |
| 2 | **Social OAuth is mock-first** — The "Connect Account" flow in `/settings/accounts` constructs a fake OAuth code and redirects to the callback. Real OAuth only activates if `META_APP_ID`, `META_APP_SECRET`, `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`, `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET` are all configured. No real OAuth redirect URL is constructed for the initial connect button. | HIGH | 2–3 days to implement proper OAuth redirect flow + env configuration per platform. |
| 3 | **Missing `/settings` index page** — Navigating to `/settings` directly returns 404. There is no `src/app/(dashboard)/settings/page.tsx`. | MEDIUM | 0.5 days — create a redirect or overview page. |
| 4 | **Post publishing is not wired to platform APIs** — `content_posts` can be created/scheduled, but `/api/posts/publish` likely does not call the actual Instagram/TikTok/LinkedIn publishing APIs (not verified but consistent with OAuth gap above). | HIGH | 2–4 days per platform after OAuth is fixed. |
| 5 | **Billing/payment provider not confirmed** — `/api/billing/checkout` has Zod validation but the actual payment processing (Stripe, MercadoPago, or other) is not confirmed wired. Given the Bolivia focus (payments track in Bs.), a local payment gateway (Stripe may not be available) needs to be identified and integrated. | MEDIUM | 3–5 days depending on provider. |

---

## Summary

| Category | Count |
|----------|-------|
| Pages — Working | 8 |
| Pages — Incomplete/Mock | 3 |
| Pages — Missing | 1 |
| API Routes — Working | ~14 |
| API Routes — Mock/Partial | ~3 |
| DB Tables | 14 |
| n8n Workflows (external) | 3 documented |

**Overall assessment:** The app has a solid foundation — auth, multi-tenancy, AI agent (Claude), Telegram alerts, payments tracking, tax calendar, notes, and task management are all functional with real Supabase queries. The main gap is the **social media platform integration layer**: analytics data is mocked, OAuth is not fully wired, and post publishing to real platforms is likely stubbed. This is the core product differentiator that needs to be completed next.
