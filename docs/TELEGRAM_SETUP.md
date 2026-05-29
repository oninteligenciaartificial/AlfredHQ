# Telegram Setup Guide — Alfred

Alfred sends Telegram alerts to the **business owner** (the Alfred user), not to their clients.

Alerts include:
- Payment confirmed
- Tax obligation due soon
- Todo due today
- Daily summary (8:00 AM Bolivia time)

---

## Step 1 — Create a bot with @BotFather

1. Open Telegram and search for `@BotFather`.
2. Send `/newbot` and follow the prompts.
3. Choose a name (e.g. `Alfred Butler`) and a username (e.g. `AlfredButlerBot`).
4. BotFather will reply with your **bot token** — keep it secret.

---

## Step 2 — Add environment variables

Add these to your `.env.local` (and to Vercel Environment Variables in production):

```env
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrSTUvwxYZ
TELEGRAM_BOT_USERNAME=AlfredButlerBot
TELEGRAM_WEBHOOK_SECRET=some-random-secret-string   # optional but recommended
CRON_SECRET=another-random-secret-string             # required for cron jobs
```

Generate `CRON_SECRET` with:
```bash
openssl rand -hex 32
```

---

## Step 3 — Register the webhook

Run this once after deploying (replace `TOKEN` and domain):

```bash
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://yourdomain.com/api/telegram/webhook",
    "secret_token": "your-TELEGRAM_WEBHOOK_SECRET-value"
  }'
```

A successful response looks like:
```json
{ "ok": true, "result": true, "description": "Webhook was set" }
```

---

## Step 4 — Connect in the Alfred dashboard

1. Go to **Alfred Dashboard → Alertas**.
2. In the "Conectar Telegram" section, find your workspace command:
   ```
   /start ws_<your-workspace-id>
   ```
3. Open Telegram, search for `@AlfredButlerBot`, and send that command.
4. Alfred saves your chat ID automatically and replies with a welcome message.
5. Click **"Probar"** next to the new channel to send a test message.

---

## Step 5 — Verify the connection

Click the **Probar** button on the Alerts page. You should receive a test message in Telegram within a few seconds.

---

## Cron schedule — Bolivia timezone note

Bolivia is **UTC-4** (no daylight saving time).

| Cron route | UTC schedule | Bolivia time |
|---|---|---|
| `/api/cron/daily-summary` | `0 12 * * *` | 08:00 AM |
| `/api/cron/tax-reminders` | `0 13 * * *` | 09:00 AM |

Cron jobs are authorized via the `CRON_SECRET` environment variable. Vercel sends `Authorization: Bearer <CRON_SECRET>` automatically. If you call the endpoints manually (e.g. for testing), pass the same header.

---

## Troubleshooting

### Bot does not respond to /start

- Confirm `TELEGRAM_BOT_TOKEN` is correct: `GET https://api.telegram.org/bot<TOKEN>/getMe`
- Confirm the webhook is registered: `GET https://api.telegram.org/bot<TOKEN>/getWebhookInfo`
- Check that `TELEGRAM_WEBHOOK_SECRET` in your env matches what you passed to `setWebhook`.

### Cron jobs return 401

- Ensure `CRON_SECRET` is set in Vercel environment variables.
- Vercel Pro/Team plan required for cron jobs. Free plan does not support them.

### Messages not arriving

- Check Supabase `notification_channels` table — the row should have `is_active = true` and `type = 'telegram'`.
- Send `/stop` to the bot to deactivate, `/start ws_<id>` to reactivate.
- Confirm the `target` column holds the correct Telegram chat ID (numeric).

### Test the daily summary manually

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://yourdomain.com/api/cron/daily-summary
```

### Check bot info programmatically

```typescript
import { getTelegramBotInfo } from '@/lib/notifications/telegram'

const info = await getTelegramBotInfo()
console.log(info) // { username: 'AlfredButlerBot', first_name: 'Alfred' }
```
