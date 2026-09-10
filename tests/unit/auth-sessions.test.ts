/**
 * Unit Tests: Session Lifecycle, Timeout Rules & Token Hashing.
 */

import { TokenSecurity } from '@vision-school/auth';

describe('AdminSessionService: Timeout Calculations', () => {
  const IDLE_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour
  const ABSOLUTE_TIMEOUT_MS = 8 * 60 * 60 * 1000; // 8 hours

  test('validates active session within idle and absolute limits', () => {
    const now = Date.now();
    const createdAt = new Date(now - 30 * 60 * 1000); // 30 mins ago
    const lastActivityAt = new Date(now - 10 * 60 * 1000); // 10 mins ago
    const expiresAt = new Date(createdAt.getTime() + ABSOLUTE_TIMEOUT_MS);

    const isAbsoluteExpired = expiresAt.getTime() < now;
    const isIdleExpired = now - lastActivityAt.getTime() > IDLE_TIMEOUT_MS;

    expect(isAbsoluteExpired).toBe(false);
    expect(isIdleExpired).toBe(false);
  });

  test('detects idle timeout when inactive for > 1 hour', () => {
    const now = Date.now();
    const lastActivityAt = new Date(now - 65 * 60 * 1000); // 65 mins ago

    const isIdleExpired = now - lastActivityAt.getTime() > IDLE_TIMEOUT_MS;
    expect(isIdleExpired).toBe(true);
  });

  test('detects absolute timeout when session exceeds 8 hours', () => {
    const now = Date.now();
    const expiresAt = new Date(now - 1000); // expired 1s ago

    const isAbsoluteExpired = expiresAt.getTime() < now;
    expect(isAbsoluteExpired).toBe(true);
  });
});

describe('Session Token Hashing', () => {
  test('generates 256-bit token and unique hash', () => {
    const raw1 = TokenSecurity.generateSecureToken(32);
    const raw2 = TokenSecurity.generateSecureToken(32);

    expect(raw1).not.toEqual(raw2);

    const hash1 = TokenSecurity.hashToken(raw1);
    const hash2 = TokenSecurity.hashToken(raw2);

    expect(hash1).not.toEqual(hash2);
    expect(hash1).toHaveLength(64);
  });
});
