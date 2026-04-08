// Rate limiter con Upstash Redis (sliding window, cross-instance)
// Fallback in-memory se le env vars non sono configurate.

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

// Singleton Redis client (riusato tra invocazioni nella stessa istanza Lambda)
let redis: Redis | null = null;
function getRedis(): Redis | null {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) return null;
  if (!redis) redis = new Redis({ url: UPSTASH_URL, token: UPSTASH_TOKEN });
  return redis;
}

// Cache dei limiter per evitare di ricrearli a ogni richiesta
const limiters = new Map<string, Ratelimit>();

function getLimiter(maxRequests: number, windowSeconds: number): Ratelimit | null {
  const r = getRedis();
  if (!r) return null;
  const key = `${maxRequests}:${windowSeconds}`;
  if (!limiters.has(key)) {
    limiters.set(
      key,
      new Ratelimit({
        redis: r,
        limiter: Ratelimit.slidingWindow(maxRequests, `${windowSeconds} s`),
        analytics: false,
      })
    );
  }
  return limiters.get(key)!;
}

// ── In-memory fallback (usato se Upstash non è configurato) ──────────────────

interface MemEntry { count: number; resetAt: number }
const store = new Map<string, MemEntry>();

setInterval(() => {
  const now = Date.now();
  for (const [k, e] of store) {
    if (now > e.resetAt) store.delete(k);
  }
}, 60_000);

function inMemoryCheck(
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = store.get(key);
  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1, resetAt: now + windowMs };
  }
  entry.count++;
  const allowed = entry.count <= maxRequests;
  return { allowed, remaining: Math.max(0, maxRequests - entry.count), resetAt: entry.resetAt };
}

// ── Export principale ─────────────────────────────────────────────────────────

/**
 * Rate limit per qualsiasi chiave (IP o userId).
 * Usa Upstash se configurato, altrimenti in-memory.
 */
export async function rateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const windowSeconds = Math.ceil(windowMs / 1000);
  const limiter = getLimiter(maxRequests, windowSeconds);

  if (limiter) {
    try {
      const result = await limiter.limit(key);
      return {
        allowed: result.success,
        remaining: result.remaining,
        resetAt: result.reset,
      };
    } catch {
      // Fallback in-memory se Upstash non risponde
    }
  }

  return inMemoryCheck(key, maxRequests, windowMs);
}

/**
 * Rate limit dedicato per utenti autenticati (più permissivo, chiave stabile).
 */
export async function rateLimitUser(
  userId: string,
  maxPerMinute = 10
): Promise<boolean> {
  const result = await rateLimit(`user:${userId}`, maxPerMinute, 60_000);
  return result.allowed;
}
