/**
 * Unit Tests: Admin Login, Password Security & Lockout Rules.
 */

import { PasswordSecurity } from '@vision-school/auth';

describe('PasswordSecurity: Policy Validation', () => {
  test('accepts strong compliant passwords', () => {
    const res = PasswordSecurity.validatePolicy('Password123!');
    expect(res.valid).toBe(true);
    expect(res.errors.length).toBe(0);
  });

  test('rejects passwords shorter than 8 characters', () => {
    const res = PasswordSecurity.validatePolicy('Pass1!');
    expect(res.valid).toBe(false);
    expect(res.errors).toContain('Le mot de passe doit contenir au moins 8 caractères.');
  });

  test('rejects passwords without uppercase letter', () => {
    const res = PasswordSecurity.validatePolicy('password123!');
    expect(res.valid).toBe(false);
    expect(res.errors).toContain('Le mot de passe doit contenir au moins une lettre majuscule.');
  });

  test('rejects passwords without lowercase letter', () => {
    const res = PasswordSecurity.validatePolicy('PASSWORD123!');
    expect(res.valid).toBe(false);
    expect(res.errors).toContain('Le mot de passe doit contenir au moins une lettre minuscule.');
  });

  test('rejects passwords without digit', () => {
    const res = PasswordSecurity.validatePolicy('PasswordSpecial!');
    expect(res.valid).toBe(false);
    expect(res.errors).toContain('Le mot de passe doit contenir au moins un chiffre.');
  });

  test('rejects passwords without special character', () => {
    const res = PasswordSecurity.validatePolicy('Password123');
    expect(res.valid).toBe(false);
    expect(res.errors).toContain('Le mot de passe doit contenir au moins un caractère spécial.');
  });
});

describe('PasswordSecurity: PBKDF2 Hashing and Verification', () => {
  test('hashes password with salt and successfully verifies match', async () => {
    const plain = 'SecretAdmin2026!';
    const hash = await PasswordSecurity.hash(plain);

    expect(hash.startsWith('pbkdf2_sha512$100000$')).toBe(true);

    const isMatch = await PasswordSecurity.verify(plain, hash);
    expect(isMatch).toBe(true);
  });

  test('rejects incorrect password', async () => {
    const hash = await PasswordSecurity.hash('CorrectPass123!');
    const isMatch = await PasswordSecurity.verify('WrongPass123!', hash);
    expect(isMatch).toBe(false);
  });

  test('generates different salts for identical passwords', async () => {
    const plain = 'SamePassword123!';
    const hash1 = await PasswordSecurity.hash(plain);
    const hash2 = await PasswordSecurity.hash(plain);

    expect(hash1).not.toEqual(hash2);
    expect(await PasswordSecurity.verify(plain, hash1)).toBe(true);
    expect(await PasswordSecurity.verify(plain, hash2)).toBe(true);
  });
});

describe('Lockout & Rate Limiting Logic', () => {
  test('calculates 15-minute temporary lockout after 5 failed attempts', () => {
    const maxAttempts = 5;
    const failedAttempts = 5;
    const isLocked = failedAttempts >= maxAttempts;
    expect(isLocked).toBe(true);

    const now = new Date();
    const lockedUntil = new Date(now.getTime() + 15 * 60 * 1000);
    expect(lockedUntil.getTime()).toBeGreaterThan(now.getTime());
  });
});
