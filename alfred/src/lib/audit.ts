import { createAdminClient } from '@/lib/supabase/server'

export type AuditAction =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILED'
  | 'LOGOUT'
  | 'PASSWORD_CHANGE'
  | 'WORKSPACE_CREATE'
  | 'SOCIAL_CONNECT'
  | 'SOCIAL_DISCONNECT'
  | 'POST_CREATE'
  | 'POST_PUBLISH'
  | 'POST_DELETE'
  | 'TASK_CREATE'
  | 'TASK_UPDATE'
  | 'GOAL_CREATE'
  | 'GOAL_UPDATE'
  | 'AGENT_CHAT'
  | 'ACCESS_DENIED'
  | 'RATE_LIMIT_EXCEEDED'
  | 'SUSPICIOUS_ACTIVITY'

export interface AuditEntry {
  timestamp: string
  level: 'info' | 'warn' | 'error' | 'critical'
  userId: string | null
  workspaceId: string | null
  action: AuditAction
  resource: string | null
  result: 'success' | 'failure' | 'blocked'
  ip: string | null
  userAgent: string | null
  requestId: string | null
  details?: Record<string, unknown>
}

export async function auditLog(entry: Omit<AuditEntry, 'timestamp'>): Promise<void> {
  const auditEntry: AuditEntry = {
    ...entry,
    timestamp: new Date().toISOString(),
  }

  // Structured JSON log — parseable by log aggregators
  const logLine = JSON.stringify({
    ...auditEntry,
    // NEVER log sensitive data
    details: sanitizeForLogging(auditEntry.details),
  })

  if (entry.level === 'error' || entry.level === 'critical') {
    console.error(logLine)
  } else if (entry.level === 'warn') {
    console.warn(logLine)
  } else {
    console.log(logLine)
  }

  // Persist to database for audit trail
  try {
    const supabase = await createAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('audit_logs') as any).insert({
      user_id: entry.userId,
      workspace_id: entry.workspaceId,
      action: entry.action,
      resource: entry.resource,
      result: entry.result,
      ip: entry.ip,
      user_agent: entry.userAgent,
      request_id: entry.requestId,
      details: entry.details ? sanitizeForLogging(entry.details) : null,
      level: entry.level,
    })

    if (error) {
      console.error('Failed to persist audit log:', error.message)
    }
  } catch {
    // Log persistence failure should not break the request
    // But we already logged to console above
  }
}

function sanitizeForLogging(obj: Record<string, unknown> | undefined): Record<string, unknown> | null {
  if (!obj) return null

  const sensitiveKeys = [
    'password', 'token', 'secret', 'key', 'authorization',
    'access_token', 'refresh_token', 'api_key', 'cookie',
    'credit_card', 'ssn', 'email', 'phone',
  ]

  const sanitized: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase()
    if (sensitiveKeys.some(sk => lowerKey.includes(sk))) {
      sanitized[key] = '[REDACTED]'
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeForLogging(value as Record<string, unknown>)
    } else {
      sanitized[key] = value
    }
  }
  return sanitized
}

export function getIpFromRequest(request: Request): string | null {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  return request.headers.get('x-real-ip')
}

export function getUserAgent(request: Request): string | null {
  return request.headers.get('user-agent')
}
