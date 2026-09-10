/**
 * RFC 6238 Time-Based One-Time Password (TOTP) and Single-Use Recovery Code Engine.
 * Built with Node.js crypto for 100% native standard compliance without external dependencies.
 */

import { createHmac, createHash, randomBytes } from 'crypto';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const TIME_STEP_SECONDS = 30;
const DIGITS = 6;

// ─── Base32 Encoding / Decoding Helpers ───────────────────────────────────────
export function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

export function base32Decode(base32: string): Buffer {
  const clean = base32.toUpperCase().replace(/=+$/, '').replace(/\s+/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (let i = 0; i < clean.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(clean[i]);
    if (idx === -1) continue;

    value = (value << 5) | idx;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

// ─── TOTP Core ────────────────────────────────────────────────────────────────
export class TotpSecurity {
  /**
   * Generates a secure random 20-byte base32 TOTP secret.
   */
  static generateSecret(): string {
    const bytes = randomBytes(20);
    return base32Encode(bytes);
  }

  /**
   * Generates the standard `otpauth://` URI for QR code generation in authenticator apps.
   */
  static generateUri(issuer: string, accountName: string, secret: string): string {
    const encodedIssuer = encodeURIComponent(issuer);
    const encodedAccount = encodeURIComponent(accountName);
    return `otpauth://totp/${encodedIssuer}:${encodedAccount}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=${DIGITS}&period=${TIME_STEP_SECONDS}`;
  }

  /**
   * Generates a 6-digit TOTP code for a given timestamp and secret.
   */
  static generateCode(secret: string, timestampMs = Date.now()): string {
    const secretBuffer = base32Decode(secret);
    const counter = Math.floor(timestampMs / 1000 / TIME_STEP_SECONDS);

    const counterBuffer = Buffer.alloc(8);
    counterBuffer.writeBigInt64BE(BigInt(counter));

    const hmac = createHmac('sha1', secretBuffer);
    hmac.update(counterBuffer);
    const digest = hmac.digest();

    const offset = digest[digest.length - 1] & 0x0f;
    const binary =
      ((digest[offset] & 0x7f) << 24) |
      ((digest[offset + 1] & 0xff) << 16) |
      ((digest[offset + 2] & 0xff) << 8) |
      (digest[offset + 3] & 0xff);

    const otp = binary % Math.pow(10, DIGITS);
    return String(otp).padStart(DIGITS, '0');
  }

  /**
   * Verifies a candidate TOTP token against a secret with ±1 step (±30s) clock drift tolerance.
   */
  static verify(token: string, secret: string, timestampMs = Date.now(), windowSteps = 1): boolean {
    if (!token || !secret) return false;
    const cleanToken = token.trim().replace(/\s+/g, '');
    if (cleanToken.length !== DIGITS) return false;

    const currentCounter = Math.floor(timestampMs / 1000 / TIME_STEP_SECONDS);

    for (let i = -windowSteps; i <= windowSteps; i++) {
      const stepTimestamp = (currentCounter + i) * TIME_STEP_SECONDS * 1000;
      const expectedCode = TotpSecurity.generateCode(secret, stepTimestamp);
      if (cleanToken === expectedCode) {
        return true;
      }
    }

    return false;
  }

  /**
   * Generates 8 single-use alphanumeric recovery codes (format: `xxxx-xxxx`) and their SHA-256 hashes.
   */
  static generateRecoveryCodes(count = 8): { plainCodes: string[]; hashedCodes: string[] } {
    const plainCodes: string[] = [];
    const hashedCodes: string[] = [];

    for (let i = 0; i < count; i++) {
      const part1 = randomBytes(2).toString('hex').toLowerCase();
      const part2 = randomBytes(2).toString('hex').toLowerCase();
      const code = `${part1}-${part2}`;
      plainCodes.push(code);

      const hash = createHash('sha256').update(code).digest('hex');
      hashedCodes.push(hash);
    }

    return { plainCodes, hashedCodes };
  }

  /**
   * Verifies and consumes a recovery code from the stored list of hashed codes.
   */
  static verifyAndConsumeRecoveryCode(
    plainCode: string,
    storedHashedCodes: string[]
  ): { valid: boolean; remainingHashedCodes: string[] } {
    if (!plainCode || !storedHashedCodes || storedHashedCodes.length === 0) {
      return { valid: false, remainingHashedCodes: storedHashedCodes || [] };
    }

    const clean = plainCode.trim().toLowerCase().replace(/\s+/g, '');
    const candidateHash = createHash('sha256').update(clean).digest('hex');

    const index = storedHashedCodes.indexOf(candidateHash);
    if (index === -1) {
      return { valid: false, remainingHashedCodes: storedHashedCodes };
    }

    const remaining = [...storedHashedCodes];
    remaining.splice(index, 1);

    return { valid: true, remainingHashedCodes: remaining };
  }
}
