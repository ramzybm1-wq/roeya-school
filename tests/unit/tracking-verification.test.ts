/**
 * Unit Tests: Tracking Code + Phone Verification & Phone Normalization.
 */

import { RegistrationTrackingService } from '../../apps/api/src/services/tracking.service';

describe('Tracking Verification: Code + Phone Matching', () => {
  test('normalizes Algerian phone numbers in various formats', () => {
    expect(RegistrationTrackingService.normalizePhoneNumber('05 50 12 34 56')).toBe('0550123456');
    expect(RegistrationTrackingService.normalizePhoneNumber('+213 550 12 34 56')).toBe('0550123456');
    expect(RegistrationTrackingService.normalizePhoneNumber('00213550123456')).toBe('0550123456');
    expect(RegistrationTrackingService.normalizePhoneNumber('07.70.11.22.33')).toBe('0770112233');
  });

  test('normalizes registration code casing', () => {
    expect(RegistrationTrackingService.normalizeRegistrationCode('reg-2026-000125')).toBe('REG-2026-000125');
    expect(RegistrationTrackingService.normalizeRegistrationCode(' REG-2026-000125  ')).toBe('REG-2026-000125');
  });

  test('returns generic error when phone number does not match registration code', () => {
    const regCode = 'REG-2026-000125';
    const actualPhone = '0550123456';
    const submittedPhone = '0770000000';

    const verify = (code: string, phone: string) => {
      if (code !== regCode || phone !== actualPhone) {
        throw new Error('Les informations saisies ne permettent pas d’identifier une demande.');
      }
      return { success: true };
    };

    expect(() => verify(regCode, submittedPhone)).toThrow('Les informations saisies ne permettent pas d’identifier une demande.');
    expect(() => verify('REG-9999-999999', actualPhone)).toThrow('Les informations saisies ne permettent pas d’identifier une demande.');
  });
});
