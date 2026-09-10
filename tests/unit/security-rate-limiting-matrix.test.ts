/**
 * Unit Tests: Route-Specific Rate Limiting Matrix.
 */

import { RateLimiters } from '../../apps/api/src/middleware/security.middleware';

describe('Security: Tiered Rate Limiting Matrix', () => {
  test('initializes discrete rate limiters for login, 2FA, tracking, contact, and registration', () => {
    expect(RateLimiters.adminLogin).toBeDefined();
    expect(RateLimiters.twoFactor).toBeDefined();
    expect(RateLimiters.trackingVerify).toBeDefined();
    expect(RateLimiters.contactSubmission).toBeDefined();
    expect(RateLimiters.publicRegistration).toBeDefined();
    expect(RateLimiters.generalAdmin).toBeDefined();
  });
});
