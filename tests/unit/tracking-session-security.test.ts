/**
 * Unit Tests: Tracking Session Security, Expiration & Scoping.
 */

import { RegistrationTrackingService } from '../../apps/api/src/services/tracking.service';

describe('Tracking Session: Security & Single-Dossier Scoping', () => {
  test('creates and successfully verifies signed session token', () => {
    const regId = 'reg_123';
    const regCode = 'REG-2026-000125';

    const token = RegistrationTrackingService.createTrackingSessionToken(regId, regCode, 900);
    expect(token).toBeDefined();

    const verification = RegistrationTrackingService.verifyTrackingSessionToken(token);
    expect(verification.valid).toBe(true);
    expect(verification.payload?.registrationId).toBe(regId);
    expect(verification.payload?.registrationCode).toBe(regCode);
  });

  test('rejects tampered session token', () => {
    const token = RegistrationTrackingService.createTrackingSessionToken('reg_1', 'REG-1', 900);
    const tampered = token.slice(0, -6) + 'XXXXXX';

    const verification = RegistrationTrackingService.verifyTrackingSessionToken(tampered);
    expect(verification.valid).toBe(false);
  });

  test('rejects expired session token', () => {
    const token = RegistrationTrackingService.createTrackingSessionToken('reg_1', 'REG-1', -10);

    const verification = RegistrationTrackingService.verifyTrackingSessionToken(token);
    expect(verification.valid).toBe(false);
    expect(verification.error).toContain('expiré');
  });
});
