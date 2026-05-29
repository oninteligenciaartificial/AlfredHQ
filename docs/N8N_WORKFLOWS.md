# AlfredHQ — n8n Automation Workflows

This document outlines the three core background workflows required to run AlfredHQ's automated features:

## 1. Daily Task Generation (7:00 AM)
- **Schedule**: Every day at `07:00 AM`.
- **HTTP Request**:
  - **Method**: `POST`
  - **URL**: `https://YOUR_ALFRED_DOMAIN/api/agent/tasks/generate`
  - **Headers**:
    - `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>`
    - `Content-Type: application/json`

---

## 2. Analytics Synchronization (Every 6 Hours)
- **Schedule**: Interval `6 hours` (e.g. `0 */6 * * *`).
- **HTTP Request**:
  - **Method**: `POST`
  - **URL**: `https://YOUR_ALFRED_DOMAIN/api/sync/analytics`
  - **Headers**:
    - `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>`
    - `Content-Type: application/json`

---

## 3. Scheduled Post Publisher (Every 15 Minutes)
- **Schedule**: Interval `15 minutes` (e.g. `*/15 * * * *`).
- **HTTP Request**:
  - **Method**: `POST`
  - **URL**: `https://YOUR_ALFRED_DOMAIN/api/posts/publish`
  - **Headers**:
    - `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>`
    - `Content-Type: application/json`
