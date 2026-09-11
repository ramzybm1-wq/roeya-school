/**
 * Cryptographic utilities for password hashing and token management.
 * Ported from @vision-school/auth — uses Node.js standard crypto (PBKDF2-SHA512).
 */

import { pbkdf2, randomBytes, createHash, createHmac, timingSafeEqual } from 'crypto';

const PBKDF2_ITERATIONS = 100000;
const KEY_LENGTH = 64;
const DIGEST = 'sha512';

// ─── Password Security ──────────────────────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  return new Promise((resolve, reject) => {
    pbkdf2(password, salt, PBKDF2_ITERATIONS, KEY_LENGTH, DIGEST, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(`pbkdf2_sha512$${PBKDF2_ITERATIONS}$${salt}$${derivedKey.toString('hex')}`);
    });
  });
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (!password || !storedHash) return false;
  const parts = storedHash.split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2_sha512') return false;

  const iterations = parseInt(parts[1], 10);
  const salt = parts[2];
  const expectedHashHex = parts[3];

  return new Promise((resolve) => {
    pbkdf2(password, salt, iterations, KEY_LENGTH, DIGEST, (err, derivedKey) => {
      if (err) return resolve(false);
      const expectedBuffer = Buffer.from(expectedHashHex, 'hex');
      if (derivedKey.length !== expectedBuffer.length) return resolve(false);
      try {
        resolve(timingSafeEqual(derivedKey, expectedBuffer));
      } catch {
        resolve(false);
      }
    });
  });
}

// ─── Token Security ──────────────────────────────────────────────────────────

export function generateSecureToken(bytes = 32): string {
  return randomBytes(bytes).toString('hex');
}

export function hashToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}

// ─── TOTP Security ───────────────────────────────────────────────────────────

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const TIME_STEP_SECONDS = 30;
const DIGITS = 6;

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

export class TotpSecurity {
  static generateSecret(): string {
    const bytes = randomBytes(20);
    return base32Encode(bytes);
  }

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
}

// ─── Session Constants ───────────────────────────────────────────────────────

export const IDLE_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour
export const ABSOLUTE_TIMEOUT_MS = 8 * 60 * 60 * 1000; // 8 hours
export const MAX_FAILED_ATTEMPTS = 5;
export const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes
