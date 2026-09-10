/**
 * Security Middleware Suite for VISION SCHOOL.
 * - HTTP Security Headers (CSP, nosniff, frame-ancestors, Referrer-Policy, HSTS)
 * - Strict CORS Allowlist (No wildcard * with credentials)
 * - Tiered Rate Limiting Matrix
 * - Recursive Log & Audit Data Sanitization
 */

import { Request, Response, NextFunction } from 'express';
import { AppError } from '@vision-school/shared';

// Sensitive keys to redact in logs & error reporting
const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'totpsecret',
  'recoverycode',
  'recoverycodes',
  'token',
  'refreshtoken',
  'accesstoken',
  'secret',
  'authorization',
  'cookie',
  'signedurl',
  'privatekey',
  'buffer',
  'filebuffer',
  'apikey',
  'sessiontoken',
]);

/**
 * Deeply scrubs sensitive data from log objects and audit payloads.
 */
export function sanitizeLogObject(data: any): any {
  if (data === null || data === undefined) return data;

  if (typeof data === 'string') {
    // Check if string looks like authorization header or token
    if (data.startsWith('Bearer ') || data.length > 250) {
      return '[REDACTED_STRING]';
    }
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeLogObject(item));
  }

  if (typeof data === 'object') {
    const sanitized: Record<string, any> = {};
    for (const [key, val] of Object.entries(data)) {
      const lowerKey = key.toLowerCase().replace(/[^a-z]/g, '');
      if (SENSITIVE_KEYS.has(lowerKey)) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitizeLogObject(val);
      }
    }
    return sanitized;
  }

  return data;
}

/**
 * HTTP Security Headers Middleware.
 */
export function securityHeadersMiddleware(req: Request, res: Response, next: NextFunction) {
  // Content Security Policy
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://maps.googleapis.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https:",
    "connect-src 'self' https://maps.googleapis.com",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
  ].join('; ');

  res.setHeader('Content-Security-Policy', csp);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  next();
}

/**
 * Strict CORS Allowlist Middleware.
 */
export function corsMiddleware(allowedOrigins: string[] = ['http://localhost:3000', 'http://localhost:3001']) {
  return (req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;

    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-CSRF-Token');
    }

    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }

    next();
  };
}

/**
 * In-Memory Sliding Window Rate Limiter.
 */
export function createRateLimiter(options: {
  windowMs: number;
  max: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
}) {
  const hits = new Map<string, { count: number; resetAt: number }>();
  const { windowMs, max, message = 'Trop de requêtes. Veuillez patienter.' } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    const key = options.keyGenerator
      ? options.keyGenerator(req)
      : req.ip || req.socket.remoteAddress || 'unknown';

    const now = Date.now();
    const record = hits.get(key);

    if (record && now < record.resetAt) {
      if (record.count >= max) {
        return res.status(429).json({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message,
          },
        });
      }
      record.count += 1;
    } else {
      hits.set(key, { count: 1, resetAt: now + windowMs });
    }

    next();
  };
}

/**
 * Pre-configured Rate Limiters for the Rate Limiting Matrix.
 */
export const RateLimiters = {
  adminLogin: createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 mins
    max: 5,
    message: 'Trop de tentatives de connexion échouées. Compte temporairement restreint pour 15 minutes.',
  }),
  twoFactor: createRateLimiter({
    windowMs: 10 * 60 * 1000, // 10 mins
    max: 5,
    message: 'Trop de tentatives de vérification 2FA. Veuillez patienter 10 minutes.',
  }),
  trackingVerify: createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 mins
    max: 5,
    message: 'Trop de tentatives de consultation de dossier. Veuillez patienter 15 minutes.',
  }),
  contactSubmission: createRateLimiter({
    windowMs: 10 * 60 * 1000, // 10 mins
    max: 5,
    message: 'Trop de messages envoyés récemment. Veuillez patienter avant de réessayer.',
  }),
  publicRegistration: createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10,
    message: 'Limite de dépôts de dossiers atteinte pour cette adresse IP. Veuillez patienter.',
  }),
  generalAdmin: createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    max: 120,
    message: 'Limite de requêtes API atteinte.',
  }),
};
