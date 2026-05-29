import { NextResponse } from 'next/server'
import { z } from 'zod'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { getCurrentUser } from '@/lib/security/authorization'
import { handleApiError } from '@/lib/security/error-handler'
import { sendWelcome } from '@/lib/notifications/email'

const bodySchema = z.object({
  email: z.string().email(),
})

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(3, '1 h'),
  prefix: 'alfred:test-email',
})

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()

    const { success } = await ratelimit.limit(user.id)
    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Límite de 3 correos de prueba por hora alcanzado.' },
        { status: 429 }
      )
    }

    const body = await request.json()
    const parsed = bodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Email inválido.' },
        { status: 400 }
      )
    }

    const { email } = parsed.data

    const ok = await sendWelcome({
      to: email,
      name: user.email ?? 'Usuario',
      workspaceName: 'Tu Negocio',
    })

    if (!ok) {
      return NextResponse.json(
        { success: false, error: 'No se pudo enviar el correo de prueba.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, message: `Correo de prueba enviado a ${email}` })
  } catch (error) {
    return handleApiError(error, { action: 'ACCESS_DENIED' })
  }
}
