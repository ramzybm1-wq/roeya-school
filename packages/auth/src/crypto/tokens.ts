/**
 * Cryptographic Token Generation & Hashing Utilities.
 * Used for session tokens, invitation tokens, password reset links, and 2FA challenge tokens.
 */

import { randomBytes, createHash } from 'crypto';

export class TokenSecurity {
  /**
   * Generates a high-entropy cryptographically secure random hexadecimal token.
   * Default 32 bytes = 64 hex characters (256 bits of entropy).
   */
  static generateSecureToken(bytes = 32): string {
    return randomBytes(bytes).toString('hex');
  }

  /**
   * Hashes a raw token using SHA-256 for secure database lookup.
   * Storing hashed tokens prevents database breach leakage of active tokens.
   */
  static hashToken(rawToken: string): string {
    return createHash('sha256').update(rawToken).digest('hex');
  }

  /**
   * Generates a prefixed token for unambiguous usage (e.g. `inv_...`, `rst_...`, `sess_...`).
   */
  static generatePrefixedToken(prefix: string, bytes = 24): string {
    const raw = randomBytes(bytes).toString('hex');
    return `${prefix}_${raw}`;
  }
}
