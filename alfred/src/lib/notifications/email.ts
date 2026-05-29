import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? 'Alfred <noreply@alfredapp.com>'

const BASE_STYLES = `
  font-family: system-ui, -apple-system, sans-serif;
  background-color: #0A0A0B;
  color: #F5F5F4;
  margin: 0;
  padding: 0;
`

function baseLayout(content: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Alfred</title>
</head>
<body style="${BASE_STYLES}">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0A0A0B; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%;">
          <!-- Logo -->
          <tr>
            <td style="padding: 0 0 24px 0; text-align: center;">
              <span style="font-size: 28px; font-weight: 700; color: #D4AF37; letter-spacing: -0.5px;">Alfred 🤵</span>
            </td>
          </tr>
          <!-- Card -->
          <tr>
            <td style="background-color:#121214; border: 1px solid #26262B; border-radius: 12px; padding: 40px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 0 0 0; text-align: center;">
              <p style="color: #6B7280; font-size: 13px; margin: 0;">Alfred — Tu mayordomo de negocios</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    })
    if (error) {
      console.error('[email] Send failed', { to, subject, error })
      return false
    }
    return true
  } catch (err) {
    console.error('[email] Unexpected error sending email', { to, subject, err })
    return false
  }
}

export async function sendPaymentConfirmed(params: {
  to: string
  payerName: string
  concept: string
  amount: number
  currency: string
  businessName: string
  paidAt: string
}): Promise<boolean> {
  const { to, payerName, concept, amount, currency, businessName, paidAt } = params

  const formattedAmount = new Intl.NumberFormat('es-BO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)

  const html = baseLayout(`
    <h1 style="color: #D4AF37; font-size: 22px; font-weight: 700; margin: 0 0 8px 0;">
      Pago Confirmado ✓
    </h1>
    <p style="color: #9CA3AF; font-size: 14px; margin: 0 0 32px 0;">
      Tu pago ha sido registrado exitosamente.
    </p>

    <!-- Amount -->
    <div style="background-color: #0A0A0B; border: 1px solid #26262B; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 32px;">
      <p style="color: #9CA3AF; font-size: 13px; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 1px;">Total pagado</p>
      <p style="color: #F5F5F4; font-size: 40px; font-weight: 700; font-family: 'Courier New', monospace; margin: 0;">
        ${currency} ${formattedAmount}
      </p>
    </div>

    <!-- Details table -->
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
      <tr style="border-bottom: 1px solid #26262B;">
        <td style="padding: 14px 0; color: #6B7280; font-size: 14px; width: 40%;">Concepto</td>
        <td style="padding: 14px 0; color: #F5F5F4; font-size: 14px; text-align: right; font-weight: 500;">${concept}</td>
      </tr>
      <tr style="border-bottom: 1px solid #26262B;">
        <td style="padding: 14px 0; color: #6B7280; font-size: 14px;">Pagado por</td>
        <td style="padding: 14px 0; color: #F5F5F4; font-size: 14px; text-align: right; font-weight: 500;">${payerName}</td>
      </tr>
      <tr style="border-bottom: 1px solid #26262B;">
        <td style="padding: 14px 0; color: #6B7280; font-size: 14px;">Fecha</td>
        <td style="padding: 14px 0; color: #F5F5F4; font-size: 14px; text-align: right; font-weight: 500;">${paidAt}</td>
      </tr>
      <tr>
        <td style="padding: 14px 0; color: #6B7280; font-size: 14px;">Negocio</td>
        <td style="padding: 14px 0; color: #F5F5F4; font-size: 14px; text-align: right; font-weight: 500;">${businessName}</td>
      </tr>
    </table>
  `)

  return sendEmail(to, `Pago Confirmado — ${concept}`, html)
}

export async function sendWelcome(params: {
  to: string
  name: string
  workspaceName: string
}): Promise<boolean> {
  const { to, name, workspaceName } = params

  const html = baseLayout(`
    <h1 style="color: #D4AF37; font-size: 22px; font-weight: 700; margin: 0 0 8px 0;">
      Bienvenido a Alfred, ${name} 👋
    </h1>
    <p style="color: #9CA3AF; font-size: 14px; margin: 0 0 24px 0;">
      Tu mayordomo de negocios ya está listo para trabajar.
    </p>
    <p style="color: #F5F5F4; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
      Tu espacio de trabajo <strong style="color: #D4AF37;">${workspaceName}</strong> ha sido activado.
      Alfred estará contigo para gestionar pagos, obligaciones fiscales, tareas y más.
    </p>
    <div style="background-color: #0A0A0B; border: 1px solid #26262B; border-radius: 8px; padding: 20px; margin-bottom: 32px;">
      <p style="color: #9CA3AF; font-size: 13px; margin: 0 0 12px 0; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Lo que Alfred hace por ti</p>
      <ul style="color: #F5F5F4; font-size: 14px; margin: 0; padding: 0 0 0 20px; line-height: 2;">
        <li>Registra y confirma pagos de clientes</li>
        <li>Te recuerda obligaciones fiscales antes de su vencimiento</li>
        <li>Gestiona tus tareas y pendientes</li>
        <li>Te notifica por Telegram o correo</li>
      </ul>
    </div>
    <div style="text-align: center;">
      <a href="https://alfredapp.com/dashboard" style="display:inline-block; background-color:#D4AF37; color:#1A1505; font-weight:700; font-size:15px; padding:14px 32px; border-radius:8px; text-decoration:none;">
        Ir al Panel
      </a>
    </div>
  `)

  return sendEmail(to, `Bienvenido a Alfred — ${workspaceName}`, html)
}

export async function sendTaxReminder(params: {
  to: string
  businessName: string
  taxType: string
  period: string
  dueDate: string
  daysUntil: number
}): Promise<boolean> {
  const { to, businessName, taxType, period, dueDate, daysUntil } = params

  const urgencyColor = daysUntil <= 3 ? '#EF4444' : daysUntil <= 7 ? '#F59E0B' : '#D4AF37'
  const urgencyText = daysUntil === 0 ? '¡Vence hoy!' : daysUntil === 1 ? 'Vence mañana' : `${daysUntil} días restantes`

  const html = baseLayout(`
    <h1 style="color: ${urgencyColor}; font-size: 22px; font-weight: 700; margin: 0 0 8px 0;">
      Obligación Fiscal Próxima ⚠️
    </h1>
    <p style="color: #9CA3AF; font-size: 14px; margin: 0 0 32px 0;">
      Recordatorio para <strong style="color: #F5F5F4;">${businessName}</strong>
    </p>

    <!-- Urgency badge -->
    <div style="background-color: ${urgencyColor}22; border: 1px solid ${urgencyColor}44; border-radius: 8px; padding: 16px; text-align: center; margin-bottom: 32px;">
      <p style="color: ${urgencyColor}; font-size: 20px; font-weight: 700; margin: 0;">${urgencyText}</p>
    </div>

    <!-- Details table -->
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
      <tr style="border-bottom: 1px solid #26262B;">
        <td style="padding: 14px 0; color: #6B7280; font-size: 14px; width: 40%;">Obligación</td>
        <td style="padding: 14px 0; color: #F5F5F4; font-size: 14px; text-align: right; font-weight: 500;">${taxType}</td>
      </tr>
      <tr style="border-bottom: 1px solid #26262B;">
        <td style="padding: 14px 0; color: #6B7280; font-size: 14px;">Período</td>
        <td style="padding: 14px 0; color: #F5F5F4; font-size: 14px; text-align: right; font-weight: 500;">${period}</td>
      </tr>
      <tr>
        <td style="padding: 14px 0; color: #6B7280; font-size: 14px;">Fecha límite</td>
        <td style="padding: 14px 0; color: ${urgencyColor}; font-size: 14px; text-align: right; font-weight: 700;">${dueDate}</td>
      </tr>
    </table>
  `)

  return sendEmail(to, `Recordatorio fiscal: ${taxType} — ${period}`, html)
}

export async function sendOwnerAlert(params: {
  to: string
  subject: string
  body: string
}): Promise<boolean> {
  const { to, subject, body } = params

  const html = baseLayout(`
    <h1 style="color: #D4AF37; font-size: 20px; font-weight: 700; margin: 0 0 24px 0;">
      ${subject}
    </h1>
    <div style="color: #F5F5F4; font-size: 15px; line-height: 1.7; white-space: pre-wrap;">${body}</div>
  `)

  return sendEmail(to, subject, html)
}
