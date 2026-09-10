/**
 * Cryptographic Password Hashing and Policy Validation.
 * Built with Node.js standard crypto (PBKDF2-SHA512) for 100% cross-platform reliability.
 */

import { pbkdf2, randomBytes, timingSafeEqual } from 'crypto';

const PBKDF2_ITERATIONS = 100000;
const KEY_LENGTH = 64; // bytes
const DIGEST = 'sha512';

export interface PasswordPolicyResult {
  valid: boolean;
  errors: string[];
}

export class PasswordSecurity {
  /**
   * Validates password against the VISION SCHOOL password policy:
   * - Minimum 8 characters
   * - At least 1 uppercase letter
   * - At least 1 lowercase letter
   * - At least 1 digit
   * - At least 1 special character (!@#$%^&*()_+-=[]{}|;:,.<>?)
   */
  static validatePolicy(password: string): PasswordPolicyResult {
    const errors: string[] = [];

    if (!password || password.length < 8) {
      errors.push('Le mot de passe doit contenir au moins 8 caractères.');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Le mot de passe doit contenir au moins une lettre majuscule.');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Le mot de passe doit contenir au moins une lettre minuscule.');
    }
    if (!/[0-9]/.test(password)) {
      errors.push('Le mot de passe doit contenir au moins un chiffre.');
    }
    if (!/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?~`]/.test(password)) {
      errors.push('Le mot de passe doit contenir au moins un caractère spécial.');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Securely hashes a plain password using PBKDF2-HMAC-SHA512 with a unique 16-byte salt.
   * Format: `pbkdf2_sha512$iterations$salt_hex$hash_hex`
   */
  static async hash(password: string): Promise<string> {
    const salt = randomBytes(16).toString('hex');

    return new Promise((resolve, reject) => {
      pbkdf2(password, salt, PBKDF2_ITERATIONS, KEY_LENGTH, DIGEST, (err, derivedKey) => {
        if (err) return reject(err);
        const hash = derivedKey.toString('hex');
        resolve(`pbkdf2_sha512$${PBKDF2_ITERATIONS}$${salt}$${hash}`);
      });
    });
  }

  /**
   * Verifies a candidate password against a stored PBKDF2 hash using constant-time comparison.
   */
  static async verify(password: string, storedHash: string): Promise<boolean> {
    if (!password || !storedHash) return false;

    const parts = storedHash.split('$');
    if (parts.length !== 4 || parts[0] !== 'pbkdf2_sha512') {
      return false;
    }

    const iterations = parseInt(parts[1], 10);
    const salt = parts[2];
    const expectedHashHex = parts[3];

    return new Promise((resolve) => {
      pbkdf2(password, salt, iterations, KEY_LENGTH, DIGEST, (err, derivedKey) => {
        if (err) return resolve(false);

        const expectedBuffer = Buffer.from(expectedHashHex, 'hex');
        if (derivedKey.length !== expectedBuffer.length) {
          return resolve(false);
        }

        try {
          const matches = timingSafeEqual(derivedKey, expectedBuffer);
          resolve(matches);
        } catch {
          resolve(false);
        }
      });
    });
  }
}
