import { z } from 'zod'

export const emailSchema = z.string().email({ message: 'Email inválido' }).max(255).toLowerCase().trim()

export const passwordSchema = z
  .string()
  .min(12, 'Mínimo 12 caracteres')
  .max(128)
  .regex(/[A-Z]/, 'Debe incluir una mayúscula')
  .regex(/[a-z]/, 'Debe incluir una minúscula')
  .regex(/[0-9]/, 'Debe incluir un número')
  .regex(/[^A-Za-z0-9]/, 'Debe incluir un carácter especial')

export const workspaceNameSchema = z.string().min(2, 'Mínimo 2 caracteres').max(100).trim()

export const socialNetworkSchema = z.enum(['instagram', 'tiktok', 'linkedin'])

export const oauthCodeSchema = z.string().min(1).max(500).regex(/^[a-zA-Z0-9\-_]+$/)

export const redirectUriSchema = z.string().url().refine((url) => {
  const parsed = new URL(url)
  const allowedHosts = [
    'localhost',
    '127.0.0.1',
    'heyalfred.io',
    'alfred.social',
    'useralfred.com',
    '*.vercel.app',
  ]
  return allowedHosts.some(host =>
    host.startsWith('*.')
      ? parsed.hostname.endsWith(host.slice(1))
      : parsed.hostname === host
  )
}, 'Redirect URI no permitido')

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export const dateRangeSchema = z.object({
  start: z.string().datetime().optional(),
  end: z.string().datetime().optional(),
}).refine((data) => {
  if (data.start && data.end) {
    return new Date(data.start) <= new Date(data.end)
  }
  return true
}, 'La fecha de inicio debe ser anterior a la fecha de fin')

export const postSchema = z.object({
  caption: z.string().max(2200, 'Máximo 2200 caracteres').optional(),
  media_urls: z.array(z.string().url()).max(10).optional(),
  networks: z.array(socialNetworkSchema).min(1).max(3),
  scheduled_at: z.string().datetime().optional(),
})

export const goalSchema = z.object({
  network: socialNetworkSchema.nullable(),
  metric: z.enum(['followers', 'engagement_rate', 'reach', 'posts_per_week']),
  target_value: z.number().positive().max(100000000),
  deadline: z.string().date().nullable(),
})

export const agentMessageSchema = z.object({
  message: z.string().min(1).max(4000, 'Máximo 4000 caracteres'),
  mode: z.enum(['advisory', 'execution']).default('advisory'),
})

export const taskUpdateSchema = z.object({
  status: z.enum(['pending', 'done', 'skipped']),
})

export const webhookSignatureSchema = z.object({
  signature: z.string().min(1),
  timestamp: z.string().regex(/^\d+$/),
})
