'use client'

import { useState } from 'react'
import { useWorkspace } from '@/hooks/use-workspace'
import {
  CreditCard,
  Zap,
  Shield,
  BarChart2,
  Users,
  CheckCircle2,
  ArrowRight,
  Loader2,
  Copy,
  Check,
  X,
} from 'lucide-react'

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 'Gratis',
    description: 'Para emprendedores que están empezando.',
    features: [
      '1 workspace',
      '3 cuentas sociales',
      'Agente Alfred básico',
      '50 posts / mes',
      'Analytics básico',
    ],
    cta: 'Tu plan actual',
    highlighted: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 'Bs. 350',
    period: '/ mes',
    description: 'Para agencias y marcas en crecimiento.',
    features: [
      'Hasta 5 workspaces',
      'Cuentas sociales ilimitadas',
      'Agente Alfred completo (IA avanzada)',
      'Posts ilimitados',
      'Analytics completo + exportación',
      'Automatización con n8n',
      'Soporte prioritario',
    ],
    cta: 'Actualizar a Pro',
    highlighted: true,
  },
]

const FEATURE_ICONS = [Shield, Zap, BarChart2, Users, CheckCircle2]

interface QRInstructions {
  bank: string
  account: string
  owner: string
  reference: string
  amount: number
  currency: string
  description: string
}

interface CheckoutModal {
  reference: string
  amount: number
  instructions: QRInstructions
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <button
      onClick={handleCopy}
      className="ml-2 inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-50 transition-colors"
    >
      {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
      {copied ? 'Copiado' : 'Copiar'}
    </button>
  )
}

function QRModal({
  modal,
  onClose,
}: {
  modal: CheckoutModal
  onClose: () => void
}) {
  const [confirmed, setConfirmed] = useState(false)

  function handlePaymentDone() {
    setConfirmed(true)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-zinc-400 hover:text-zinc-600 transition-colors"
          aria-label="Cerrar"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="p-6">
          <h2 className="text-xl font-bold text-zinc-900">Pago por transferencia QR</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Realiza una transferencia interbancaria a los siguientes datos.
          </p>

          {/* Amount badge */}
          <div className="mt-4 flex items-center justify-center rounded-xl bg-zinc-900 py-4">
            <span className="text-3xl font-extrabold text-white">
              Bs. {modal.amount}
            </span>
            <span className="ml-2 text-sm text-zinc-400">/ mes</span>
          </div>

          {/* Bank details */}
          <div className="mt-4 rounded-xl border border-zinc-100 bg-zinc-50 p-4 space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-zinc-500">Banco</span>
              <span className="font-semibold text-zinc-900">{modal.instructions.bank}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-500">Nro. de cuenta</span>
              <div className="flex items-center">
                <span className="font-semibold text-zinc-900">{modal.instructions.account}</span>
                <CopyButton text={modal.instructions.account} />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-500">Titular</span>
              <span className="font-semibold text-zinc-900">{modal.instructions.owner}</span>
            </div>
          </div>

          {/* Reference */}
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 mb-1">
              Referencia — incluir en la transferencia
            </p>
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm font-bold text-zinc-900 break-all">
                {modal.reference}
              </span>
              <CopyButton text={modal.reference} />
            </div>
          </div>

          <p className="mt-3 text-xs text-zinc-400">{modal.instructions.description}</p>

          {/* CTA */}
          {confirmed ? (
            <div className="mt-5 flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
              <p className="text-sm text-green-800">
                Tu pago está siendo verificado. Te notificaremos por email en{' '}
                <strong>24-48 horas</strong>.
              </p>
            </div>
          ) : (
            <button
              onClick={handlePaymentDone}
              className="mt-5 w-full rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white hover:bg-zinc-800 transition-colors"
            >
              Ya realicé el pago
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function PlanCard({
  plan,
  isActive,
  onUpgrade,
  loading,
}: {
  plan: typeof PLANS[number]
  isActive: boolean
  onUpgrade: () => void
  loading: boolean
}) {
  return (
    <div
      className={`relative flex flex-col rounded-2xl border p-6 transition-shadow ${
        plan.highlighted
          ? 'border-zinc-900 shadow-xl shadow-zinc-200/60'
          : 'border-zinc-200'
      }`}
    >
      {plan.highlighted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1 rounded-full bg-zinc-900 px-3 py-0.5 text-xs font-semibold text-white">
            <Zap className="h-3 w-3" /> Recomendado
          </span>
        </div>
      )}

      <div className="mb-4">
        <h3 className="text-lg font-bold text-zinc-900">{plan.name}</h3>
        <p className="text-sm text-zinc-500 mt-0.5">{plan.description}</p>
      </div>

      <div className="mb-6 flex items-baseline gap-1">
        <span className="text-4xl font-extrabold text-zinc-900">{plan.price}</span>
        {plan.period && (
          <span className="text-sm text-zinc-400">{plan.period}</span>
        )}
      </div>

      <ul className="mb-8 flex-1 space-y-2.5">
        {plan.features.map((feature, i) => {
          const Icon = FEATURE_ICONS[i % FEATURE_ICONS.length]
          return (
            <li key={feature} className="flex items-start gap-2.5 text-sm text-zinc-700">
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
              {feature}
            </li>
          )
        })}
      </ul>

      {isActive ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm font-medium text-zinc-500">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          Plan activo
        </div>
      ) : (
        <button
          id={`upgrade-to-${plan.id}-btn`}
          onClick={onUpgrade}
          disabled={loading}
          className={`flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
            plan.highlighted
              ? 'bg-zinc-900 text-white hover:bg-zinc-800 disabled:opacity-60'
              : 'border border-zinc-200 text-zinc-700 hover:bg-zinc-50 disabled:opacity-60'
          }`}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              {plan.cta}
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      )}
    </div>
  )
}

export default function BillingPage() {
  const { workspace, loading: wsLoading } = useWorkspace()
  const [upgrading, setUpgrading] = useState(false)
  const [modal, setModal] = useState<CheckoutModal | null>(null)

  async function handleUpgrade() {
    if (!workspace) return
    setUpgrading(true)

    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId: workspace.id }),
      })
      const json = await res.json() as {
        success?: boolean
        reference?: string
        amount?: number
        instructions?: QRInstructions
        error?: string
      }

      if (json.success && json.reference && json.amount && json.instructions) {
        setModal({
          reference: json.reference,
          amount: json.amount,
          instructions: json.instructions,
        })
      } else {
        alert(json.error ?? 'No se pudo iniciar el proceso de pago.')
      }
    } catch {
      alert('Error de red. Intenta de nuevo.')
    } finally {
      setUpgrading(false)
    }
  }

  const activePlan = workspace?.plan ?? 'starter'

  if (wsLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-300" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl">
      {modal && (
        <QRModal modal={modal} onClose={() => setModal(null)} />
      )}

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-zinc-900">Facturación</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Gestiona tu suscripción y plan de {workspace?.name ?? 'tu workspace'}.
        </p>
      </div>

      {/* Current Plan Summary Card */}
      <div className="mb-8 flex items-center justify-between rounded-2xl border border-zinc-200 bg-white px-6 py-5">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900">
            <CreditCard className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-sm text-zinc-500">Plan actual</p>
            <p className="font-semibold capitalize text-zinc-900">
              {activePlan === 'pro'
                ? 'Pro — Bs. 350/mes'
                : activePlan === 'internal'
                ? 'Internal (equipo)'
                : 'Starter — Gratis'}
            </p>
          </div>
        </div>
      </div>

      {/* Plan Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {PLANS.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            isActive={activePlan === plan.id}
            onUpgrade={plan.id === 'pro' ? handleUpgrade : () => {}}
            loading={upgrading}
          />
        ))}
      </div>

      {/* FAQ / Extra info */}
      <div className="mt-10 rounded-2xl border border-zinc-100 bg-zinc-50 px-6 py-5">
        <h2 className="text-sm font-semibold text-zinc-800 mb-3">Preguntas frecuentes</h2>
        <div className="space-y-3 text-sm text-zinc-600">
          <div>
            <p className="font-medium text-zinc-800">¿Cómo realizo el pago?</p>
            <p className="mt-0.5">
              Haz clic en "Actualizar a Pro" para recibir los datos de transferencia interbancaria. Una vez confirmado tu pago, activaremos tu plan en 24-48 horas.
            </p>
          </div>
          <div>
            <p className="font-medium text-zinc-800">¿Puedo cancelar cuando quiera?</p>
            <p className="mt-0.5">Sí. Tu plan Pro se mantiene activo hasta el final del período facturado.</p>
          </div>
          <div>
            <p className="font-medium text-zinc-800">¿Qué pasa con mis datos si cancelo?</p>
            <p className="mt-0.5">Todos tus datos permanecen seguros. Solo se desactivarán las funciones Pro.</p>
          </div>
          <div>
            <p className="font-medium text-zinc-800">¿Hay descuentos por volumen?</p>
            <p className="mt-0.5">Contáctanos en <a href="mailto:hola@alfredhq.com" className="underline">hola@alfredhq.com</a> para planes de agencia.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
