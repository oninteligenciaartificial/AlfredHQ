// Global error handler: NEVER expose stack traces or internal details to client

import { auditLog, type AuditAction } from '@/lib/audit'

export class AppError extends Error {
  public readonly statusCode: number
  public readonly isOperational: boolean
  public readonly code?: string

  constructor(message: string, statusCode: number, code?: string, isOperational = true) {
    super(message)
    this.name = 'AppError'
    this.statusCode = statusCode
    this.code = code
    this.isOperational = isOperational
    Error.captureStackTrace(this, this.constructor)
  }
}

export function handleApiError(error: unknown, context: { action: AuditAction; userId?: string; workspaceId?: string }): Response {
  // Log full error server-side
  if (error instanceof AppError) {
    auditLog({
      level: error.statusCode >= 500 ? 'error' : 'warn',
      userId: context.userId || null,
      workspaceId: context.workspaceId || null,
      action: 'ACCESS_DENIED',
      resource: context.action,
      result: 'failure',
      ip: null,
      userAgent: null,
      requestId: null,
      details: { error: error.message, code: error.code },
    })

    return Response.json(
      { error: error.message, code: error.code },
      { status: error.statusCode }
    )
  }

  // Unknown errors: generic message, full details logged
  const message = process.env.NODE_ENV === 'production'
    ? 'Internal server error'
    : error instanceof Error
      ? error.message
      : 'Unknown error'

  auditLog({
    level: 'error',
    userId: context.userId || null,
    workspaceId: context.workspaceId || null,
    action: context.action,
    resource: null,
    result: 'failure',
    ip: null,
    userAgent: null,
    requestId: null,
    details: {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    },
  })

  // NEVER send stack trace to client
  return Response.json(
    { error: message },
    { status: 500 }
  )
}

export function withErrorHandling<T extends unknown[], R>(
  handler: (...args: T) => Promise<R>
): (...args: T) => Promise<R> {
  return async (...args: T) => {
    try {
      return await handler(...args)
    } catch (error) {
      if (error instanceof AppError) throw error
      throw new AppError(
        'Internal server error',
        500,
        'INTERNAL_ERROR'
      )
    }
  }
}

// Circuit breaker for external services
interface CircuitBreakerState {
  failures: number
  lastFailure: number
  state: 'closed' | 'open' | 'half-open'
}

const circuitBreakers = new Map<string, CircuitBreakerState>()

const CIRCUIT_BREAKER_THRESHOLD = 5
const CIRCUIT_BREAKER_TIMEOUT = 60000 // 1 minute

export async function withCircuitBreaker<T>(
  service: string,
  fn: () => Promise<T>
): Promise<T> {
  const state = circuitBreakers.get(service) || {
    failures: 0,
    lastFailure: 0,
    state: 'closed',
  }

  if (state.state === 'open') {
    if (Date.now() - state.lastFailure > CIRCUIT_BREAKER_TIMEOUT) {
      state.state = 'half-open'
    } else {
      throw new AppError(`${service} is temporarily unavailable`, 503, 'SERVICE_UNAVAILABLE')
    }
  }

  try {
    const result = await fn()
    state.failures = 0
    state.state = 'closed'
    circuitBreakers.set(service, state)
    return result
  } catch (error) {
    state.failures++
    state.lastFailure = Date.now()
    if (state.failures >= CIRCUIT_BREAKER_THRESHOLD) {
      state.state = 'open'
    }
    circuitBreakers.set(service, state)
    throw error
  }
}
