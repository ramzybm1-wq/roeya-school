/**
 * Unit Tests: Public Status Mapping & Respectful Messages.
 */

import { RegistrationTrackingService } from '../../apps/api/src/services/tracking.service';

describe('Tracking Status: Internal to Public Status Mapping', () => {
  test('maps ACCEPTED status to client friendly message', () => {
    const mapped = RegistrationTrackingService.mapPublicStatus('ACCEPTED');

    expect(mapped.status).toBe('ACCEPTED');
    expect(mapped.labelFr).toBe('Demande acceptée');
    expect(mapped.messageFr).toContain('L’établissement vous contactera');
  });

  test('maps REFUSED status to NOT_RETAINED without internal rejection codes', () => {
    const mapped = RegistrationTrackingService.mapPublicStatus('REFUSED');

    expect(mapped.status).toBe('NOT_RETAINED');
    expect(mapped.labelFr).toBe('Demande non retenue');
    expect(mapped.messageFr).toContain('n’a pas été retenue');
  });

  test('maps WAITLISTED status to client waiting message', () => {
    const mapped = RegistrationTrackingService.mapPublicStatus('WAITLISTED');

    expect(mapped.status).toBe('WAITLISTED');
    expect(mapped.labelFr).toBe('Liste d’attente');
    expect(mapped.messageFr).toContain('liste d’attente');
  });
});
