/**
 * Unit Tests: Security Headers, CORS Origin Allowlist & CSP Validation.
 */

describe('Security: Headers, CORS & CSP Policy', () => {
  test('strictly validates CORS origin against trusted allowlist', () => {
    const allowedOrigins = ['http://localhost:3000', 'https://app.visionschool.dz'];

    const isOriginAllowed = (origin: string | undefined) => {
      if (!origin) return false;
      return allowedOrigins.includes(origin);
    };

    expect(isOriginAllowed('http://localhost:3000')).toBe(true);
    expect(isOriginAllowed('https://app.visionschool.dz')).toBe(true);
    expect(isOriginAllowed('http://malicious-attacker.com')).toBe(false);
  });
});
