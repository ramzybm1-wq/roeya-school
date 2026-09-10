/**
 * Structured Request Logger Middleware.
 * Never logs sensitive data such as passwords, tokens, or private PDF contents.
 */

export interface RequestLogContext {
  method: string;
  url: string;
  ip?: string;
  userAgent?: string;
  userId?: string;
}

export class LoggerMiddleware {
  static sanitizePayload(body: unknown): unknown {
    if (!body || typeof body !== 'object') return body;
    const sanitized = { ...(body as Record<string, unknown>) };
    const sensitiveKeys = ['password', 'token', 'secret', 'authSecret', 'refreshToken', 'buffer'];

    for (const key of Object.keys(sanitized)) {
      if (sensitiveKeys.some((s) => key.toLowerCase().includes(s.toLowerCase()))) {
        sanitized[key] = '[REDACTED]';
      }
    }
    return sanitized;
  }

  static logRequest(context: RequestLogContext, payload?: unknown): void {
    const timestamp = new Date().toISOString();
    const safePayload = this.sanitizePayload(payload);
    // Structured JSON log output
    const logEntry = {
      timestamp,
      level: 'INFO',
      ...context,
      payload: safePayload,
    };
    // Log in development / production log stream
    if (process.env.NODE_ENV !== 'test') {
      console.log(JSON.stringify(logEntry));
    }
  }
}
