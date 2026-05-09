// Rate limiting with in-memory fallback (Upstash optional)
// Uses sliding window algorithm

interface RateLimitEntry {
  count: number
  resetAt: number
}

// In-memory store for development (replace with Redis/Upstash in production)
const memoryStore = new Map<string, RateLimitEntry>()

const RATE_LIMITS = {
  auth: { max: 5, window: 15 * 60 * 1000 },        // 5 attempts / 15 min
  public: { max: 100, window: 60 * 1000 },           // 100 req / min
  protected: { max: 200, window: 60 * 1000 },        // 200 req / min
  ai: { max: 10, window: 60 * 1000 },                // 10 AI req / min
  export: { max: 5, window: 60 * 60 * 1000 },        // 5 exports / hour
  webhook: { max: 50, window: 60 * 1000 },           // 50 webhooks / min
  upload: { max: 20, window: 60 * 60 * 1000 },       // 20 uploads / hour
} as const

export type RateLimitTier = keyof typeof RATE_LIMITS

export async function checkRateLimit(
  key: string,
  tier: RateLimitTier = 'protected'
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const config = RATE_LIMITS[tier]
  const now = Date.now()
  const storeKey = `ratelimit:${tier}:${key}`

  // Use Upstash if configured, otherwise in-memory
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    return checkRateLimitRedis(storeKey, config)
  }

  return checkRateLimitMemory(storeKey, config, now)
}

async function checkRateLimitRedis(
  key: string,
  config: { max: number; window: number }
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const { Redis } = await import('@upstash/redis')
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  })

  const now = Date.now()
  const windowStart = now - config.window

  // Sliding window: remove old entries, count current
  const pipeline = redis.pipeline()
  pipeline.zremrangebyscore(key, 0, windowStart)
  pipeline.zcard(key)
  pipeline.expire(key, Math.ceil(config.window / 1000))

  const [, count] = await pipeline.exec<[number, number]>()
  const currentCount = count ?? 0

  if (currentCount >= config.max) {
    const resetAt = now + config.window
    return { allowed: false, remaining: 0, resetAt }
  }

  await redis.zadd(key, { score: now, member: `${now}-${Math.random()}` })
  await redis.expire(key, Math.ceil(config.window / 1000))

  return {
    allowed: true,
    remaining: config.max - currentCount - 1,
    resetAt: now + config.window,
  }
}

function checkRateLimitMemory(
  key: string,
  config: { max: number; window: number },
  now: number
): { allowed: boolean; remaining: number; resetAt: number } {
  const entry = memoryStore.get(key)

  if (!entry || now > entry.resetAt) {
    memoryStore.set(key, {
      count: 1,
      resetAt: now + config.window,
    })
    return {
      allowed: true,
      remaining: config.max - 1,
      resetAt: now + config.window,
    }
  }

  if (entry.count >= config.max) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
    }
  }

  entry.count++
  return {
    allowed: true,
    remaining: config.max - entry.count,
    resetAt: entry.resetAt,
  }
}

export function getRateLimitHeaders(
  result: { allowed: boolean; remaining: number; resetAt: number }
): Record<string, string> {
  return {
    'X-RateLimit-Limit': String(result.remaining + (result.allowed ? 0 : 1)),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil(result.resetAt / 1000)),
    ...(result.allowed ? {} : { 'Retry-After': String(Math.ceil((result.resetAt - Date.now()) / 1000)) }),
  }
}
