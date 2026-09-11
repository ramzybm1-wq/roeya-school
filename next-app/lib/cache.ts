/**
 * High-performance in-memory TTL cache with tag-based invalidation.
 * Designed for serverless environments with automatic expiration and
 * low overhead (no external dependencies like Redis required).
 *
 * Usage:
 *   const schools = await cached('schools', () => prisma.schools.findMany(), { ttl: 60, tags: ['schools'] });
 *   invalidateCache('schools'); // Instantly invalidate all entries tagged 'schools'
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  tags: string[];
}

const cacheStore = new Map<string, CacheEntry<unknown>>();

// Periodic cleanup every 120 seconds to evict expired entries
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of cacheStore.entries()) {
      if (entry.expiresAt <= now) {
        cacheStore.delete(key);
      }
    }
  }, 120000).unref?.();
}

interface CacheOptions {
  /** Time-to-live in seconds (default: 60) */
  ttl?: number;
  /** Tags for grouped invalidation (e.g. ['schools', 'public']) */
  tags?: string[];
}

/**
 * Retrieve a cached value or execute the factory function and cache the result.
 */
export async function cached<T>(
  key: string,
  factory: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  const { ttl = 60, tags = [] } = options;
  const now = Date.now();

  const existing = cacheStore.get(key);
  if (existing && existing.expiresAt > now) {
    return existing.value as T;
  }

  const value = await factory();
  cacheStore.set(key, {
    value,
    expiresAt: now + ttl * 1000,
    tags,
  });

  return value;
}

/**
 * Invalidate all cache entries matching the given tag.
 * Call this when an admin mutates data (e.g. updates schools, settings, etc.)
 */
export function invalidateCache(tag: string): void {
  for (const [key, entry] of cacheStore.entries()) {
    if (entry.tags.includes(tag)) {
      cacheStore.delete(key);
    }
  }
}

/**
 * Invalidate a specific cache key.
 */
export function invalidateCacheKey(key: string): void {
  cacheStore.delete(key);
}

/**
 * Clear the entire cache.
 */
export function clearCache(): void {
  cacheStore.clear();
}
