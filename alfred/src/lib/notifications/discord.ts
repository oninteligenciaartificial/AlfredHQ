import { validateExternalUrl } from '@/lib/security/ssrf'

export async function sendDiscordMessage(webhookUrl: string, content: string): Promise<boolean> {
  try {
    const validation = await validateExternalUrl(webhookUrl, ['discord.com', 'discordapp.com'])
    if (!validation.valid) {
      console.error('[Discord] URL validation failed', validation.error)
      return false
    }

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    })

    if (!res.ok) {
      console.error('[Discord] sendMessage failed', { status: res.status })
      return false
    }

    return true
  } catch (err) {
    console.error('[Discord] sendMessage error', err)
    return false
  }
}
