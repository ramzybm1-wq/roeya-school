/**
 * Unit Tests: Two-Factor Authentication (TOTP) and Single-Use Recovery Codes.
 */

import { TotpSecurity, AuthGuard } from '@vision-school/auth';

describe('TotpSecurity: Secret & URI Generation', () => {
  test('generates valid Base32 TOTP secret', () => {
    const secret = TotpSecurity.generateSecret();
    expect(secret).toBeDefined();
    expect(typeof secret).toBe('string');
    expect(secret.length).toBeGreaterThanOrEqual(16);
    // Base32 characters only
    expect(/^[A-Z2-7]+$/.test(secret)).toBe(true);
  });

  test('generates standard otpauth URI', () => {
    const secret = TotpSecurity.generateSecret();
    const uri = TotpSecurity.generateUri('VISION SCHOOL', 'admin@visionschool.dz', secret);

    expect(uri.startsWith('otpauth://totp/')).toBe(true);
    expect(uri).toContain('secret=' + secret);
    expect(uri).toContain('issuer=VISION%20SCHOOL');
    expect(uri).toContain('digits=6');
    expect(uri).toContain('period=30');
  });
});

describe('TotpSecurity: Code Generation & Verification', () => {
  test('generates and verifies 6-digit TOTP code', () => {
    const secret = TotpSecurity.generateSecret();
    const now = Date.now();
    const code = TotpSecurity.generateCode(secret, now);

    expect(code).toHaveLength(6);
    expect(/^\d{6}$/.test(code)).toBe(true);

    const isValid = TotpSecurity.verify(code, secret, now);
    expect(isValid).toBe(true);
  });

  test('accepts code with ±1 step (±30s) clock drift tolerance', () => {
    const secret = TotpSecurity.generateSecret();
    const now = Date.now();

    // Code generated 25 seconds in the past
    const pastCode = TotpSecurity.generateCode(secret, now - 25000);
    expect(TotpSecurity.verify(pastCode, secret, now, 1)).toBe(true);

    // Code generated 25 seconds in the future
    const futureCode = TotpSecurity.generateCode(secret, now + 25000);
    expect(TotpSecurity.verify(futureCode, secret, now, 1)).toBe(true);
  });

  test('rejects incorrect 6-digit code', () => {
    const secret = TotpSecurity.generateSecret();
    const now = Date.now();
    expect(TotpSecurity.verify('000000', secret, now)).toBe(false);
    expect(TotpSecurity.verify('999999', secret, now)).toBe(false);
  });
});

describe('TotpSecurity: Single-Use Recovery Codes', () => {
  test('generates 8 single-use recovery codes with hashes', () => {
    const { plainCodes, hashedCodes } = TotpSecurity.generateRecoveryCodes(8);

    expect(plainCodes).toHaveLength(8);
    expect(hashedCodes).toHaveLength(8);

    // Format: xxxx-xxxx
    for (const code of plainCodes) {
      expect(/^[0-9a-f]{4}-[0-9a-f]{4}$/.test(code)).toBe(true);
    }
  });

  test('verifies and consumes recovery code once', () => {
    const { plainCodes, hashedCodes } = TotpSecurity.generateRecoveryCodes(8);
    const codeToUse = plainCodes[2];

    const result = TotpSecurity.verifyAndConsumeRecoveryCode(codeToUse, hashedCodes);
    expect(result.valid).toBe(true);
    expect(result.remainingHashedCodes).toHaveLength(7);

    // Attempting to reuse the consumed code fails
    const reuseResult = TotpSecurity.verifyAndConsumeRecoveryCode(codeToUse, result.remainingHashedCodes);
    expect(reuseResult.valid).toBe(false);
    expect(reuseResult.remainingHashedCodes).toHaveLength(7);
  });
});

describe('2FA Role Policy Rules', () => {
  test('SUPER_ADMIN role strictly requires 2FA', () => {
    expect(AuthGuard.is2FaMandatoryForRole('SUPER_ADMIN')).toBe(true);
    expect(AuthGuard.is2FaMandatoryForRole('ADMIN')).toBe(false);
    expect(AuthGuard.is2FaMandatoryForRole('AGENT')).toBe(false);
  });

  test('SUPER_ADMIN is forbidden from disabling 2FA', () => {
    const superAdminUser = {
      id: '1', email: 's@school.dz', firstName: 'N', lastName: 'B',
      role: 'SUPER_ADMIN' as const, status: 'ACTIVE' as const,
      allowedSchoolIds: [], isTwoFactorEnabled: true, createdAt: '', updatedAt: '',
    };
    const adminUser = {
      ...superAdminUser, role: 'ADMIN' as const,
    };

    expect(AuthGuard.canDisable2Fa(superAdminUser)).toBe(false);
    expect(AuthGuard.canDisable2Fa(adminUser)).toBe(true);
  });
});
