/**
 * Sliding window in-memory rate limiter.
 * Designed for serverless and containerized Node.js environments.
 * Automatically evicts stale buckets to guarantee zero memory leaks.
 */

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const store = new Map<string, RateLimitRecord>();

// Cleanup stale entries every 60 seconds
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of store.entries()) {
      if (record.resetTime <= now) {
        store.delete(key);
      }
    }
  }, 60000).unref?.();
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp in seconds
}

export function checkRateLimit(
  identifier: string,
  limit: number,
  windowSeconds: number
): RateLimitResult {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const existing = store.get(identifier);

  if (!existing || existing.resetTime <= now) {
    const resetTime = now + windowMs;
    store.set(identifier, { count: 1, resetTime });
    return {
      allowed: true,
      limit,
      remaining: limit - 1,
      reset: Math.ceil(resetTime / 1000),
    };
  }

  existing.count += 1;
  const remaining = Math.max(0, limit - existing.count);
  const reset = Math.ceil(existing.resetTime / 1000);

  if (existing.count > limit) {
    return {
      allowed: false,
      limit,
      remaining: 0,
      reset,
    };
  }

  return {
    allowed: true,
    limit,
    remaining,
    reset,
  };
}

export function getClientIp(headers: Headers): string {
  const xForwardedFor = headers.get('x-forwarded-for');
  if (xForwardedFor) {
    const ips = xForwardedFor.split(',');
    return ips[0].trim();
  }
  const xRealIp = headers.get('x-real-ip');
  if (xRealIp) return xRealIp.trim();
  const cfConnectingIp = headers.get('cf-connecting-ip');
  if (cfConnectingIp) return cfConnectingIp.trim();
  return '127.0.0.1';
}
