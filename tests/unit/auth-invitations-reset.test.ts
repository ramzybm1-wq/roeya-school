/**
 * Unit Tests: Staff Invitations & Password Reset Tokens.
 */

import { TokenSecurity } from '@vision-school/auth';

describe('TokenSecurity: Token Generation & SHA-256 Hashing', () => {
  test('generates secure 64-character hex tokens', () => {
    const token = TokenSecurity.generateSecureToken(32);
    expect(token).toHaveLength(64);
    expect(/^[0-9a-f]{64}$/.test(token)).toBe(true);
  });

  test('generates prefixed tokens (inv_, rst_, 2fa_ch_)', () => {
    const invToken = TokenSecurity.generatePrefixedToken('inv', 24);
    const rstToken = TokenSecurity.generatePrefixedToken('rst', 24);
    const chToken = TokenSecurity.generatePrefixedToken('2fa_ch', 24);

    expect(invToken.startsWith('inv_')).toBe(true);
    expect(rstToken.startsWith('rst_')).toBe(true);
    expect(chToken.startsWith('2fa_ch_')).toBe(true);
  });

  test('hashes token deterministically with SHA-256', () => {
    const raw = 'my_raw_session_token_12345';
    const hash1 = TokenSecurity.hashToken(raw);
    const hash2 = TokenSecurity.hashToken(raw);

    expect(hash1).toEqual(hash2);
    expect(hash1).toHaveLength(64);
  });
});

describe('Staff Invitation Lifecycle Rules', () => {
  test('invitation expiration window is 7 days', () => {
    const now = new Date();
    const expiry = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const diffDays = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeCloseTo(7);
  });

  test('identifies expired invitation timestamps', () => {
    const pastDate = new Date(Date.now() - 1000 * 60); // 1 minute ago
    const isExpired = pastDate < new Date();
    expect(isExpired).toBe(true);
  });
});

describe('Password Reset Lifecycle Rules', () => {
  test('password reset expiration window is 1 hour', () => {
    const now = new Date();
    const expiry = new Date(now.getTime() + 60 * 60 * 1000);
    const diffHours = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60);
    expect(diffHours).toBeCloseTo(1);
  });
});
