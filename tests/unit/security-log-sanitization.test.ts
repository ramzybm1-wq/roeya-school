/**
 * Unit Tests: Sensitive Data Redaction in Server Logs & Audit Payloads.
 */

import { sanitizeLogObject } from '../../apps/api/src/middleware/security.middleware';

describe('Security: Log & Audit Data Sanitization', () => {
  test('recursively redacts passwords, TOTP secrets, tokens, and authorization headers', () => {
    const rawPayload = {
      email: 'admin@visionschool.dz',
      password: 'SuperSecretPassword123!',
      nested: {
        totpSecret: 'JBSWY3DPEHPK3PXP',
        recoveryCodes: ['REC-111', 'REC-222'],
        sessionToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      },
      headers: {
        authorization: 'Bearer secret_jwt_token',
      },
    };

    const sanitized = sanitizeLogObject(rawPayload);

    expect(sanitized.email).toBe('admin@visionschool.dz');
    expect(sanitized.password).toBe('[REDACTED]');
    expect(sanitized.nested.totpSecret).toBe('[REDACTED]');
    expect(sanitized.nested.recoveryCodes).toBe('[REDACTED]');
    expect(sanitized.nested.sessionToken).toBe('[REDACTED]');
    expect(sanitized.headers.authorization).toBe('[REDACTED]');
  });
});
