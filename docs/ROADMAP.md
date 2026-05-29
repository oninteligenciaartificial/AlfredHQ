# Alfred — Product Roadmap

> Last updated: 2026-05-28

---

## Phase 1 — MVP (Internal OnIA use)

**Goal:** A working product used daily by OnIA to manage its own social accounts.

### Week 1-2: Foundation

- [ ] Next.js 15 project setup with TypeScript, Tailwind, shadcn/ui
- [ ] Supabase project: full database schema with RLS policies
- [ ] Auth: magic link login, protected routes via Next.js middleware
- [ ] Dashboard layout with sidebar navigation
- [ ] Settings/Accounts: OAuth connection flow for Instagram and LinkedIn

### Week 3-4: Core Features

- [ ] Dashboard page: metric cards + daily tasks overview
- [ ] Manual analytics sync (button) before automating
- [ ] Goals system: create/edit goals per network, progress view
- [ ] Daily tasks: manual creation + agent-generated tasks

### Week 5-6: AI Agent

- [ ] Agent chat page with persistent conversation history
- [ ] Advisory mode: context injection, streaming responses
- [ ] Execution mode: tools — `schedule_post`, `create_draft`, `get_analytics`, `complete_task`
- [ ] Floating agent button accessible from all pages

### Week 7-8: Content & Video

- [ ] Post editor: text + image + video upload to Supabase Storage
- [ ] Monthly content calendar
- [ ] Direct publish to Instagram and LinkedIn
- [ ] Reels video upload (Meta resumable endpoint, MP4)
- [ ] TikTok video upload (Content Posting API)

### Week 9: Automation

- [ ] n8n: daily task generation cron (7:00 AM)
- [ ] n8n: analytics sync every 6 hours
- [ ] n8n: scheduled post publishing
- [ ] Meta webhooks for comments

---

## Phase 2 — Polish & Analytics

**Goal:** Make the product stable and insightful enough to show clients.

- [ ] Advanced analytics: best posting time heatmap, cross-network comparison
- [ ] Instagram DMs (post Meta approval) — UI already built in Phase 1
- [ ] Comment management panel (unified inbox)
- [ ] Exportable PDF reports
- [ ] Performance improvements: materialized views for agent context
- [ ] Error monitoring (Sentry or similar)

---

## Phase 3 — Multi-tenant & Onboarding

**Goal:** Allow external clients to sign up and use the product.

- [ ] Multi-workspace UI: onboarding flow for new clients
- [ ] Workspace invitation / team members (viewer / editor / admin roles)
- [ ] Guided onboarding for new users
- [ ] In-app notifications

---

## Phase 4 — Billing & Commercial Launch

**Goal:** Charge for the product.

- [ ] Pricing model: define tiers (Starter / Pro / Agency)
- [ ] Payment integration: Libélula (Bolivia) or Stripe (international)
- [ ] Usage limits per plan (workspaces, social accounts, agent messages)
- [ ] Billing settings page
- [ ] Subscription lifecycle: upgrade, downgrade, cancellation

---

## Phase 5 — Scale & Integrations

**Goal:** Grow beyond standalone SaaS, integrate with OnIA ecosystem.

- [ ] Public API with API key management (service-to-service auth)
- [ ] DentaGest integration: provision Alfred workspace when add-on is toggled
- [ ] Webhook outbound: notify external SaaS of events
- [ ] API documentation portal
- [ ] LinkedIn Analytics API (when available)
- [ ] TikTok DMs (if API becomes available)

---

## Deferred / Nice-to-Have

- Mobile app (React Native or PWA)
- White-label option for agencies
- AI-generated image/video suggestions via fal.ai
- Competitor analysis module
- Hashtag performance tracking
