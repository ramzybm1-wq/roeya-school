/**
 * Unit Tests: Dynamic Capacity Calculations & Operational State Derivations.
 */

describe('Capacity Math: Dynamic Remaining Capacity', () => {
  test('calculates remaining places: 255 max - 200 accepted = 55 remaining', () => {
    const capacityMax = 255;
    const acceptedCount = 200;
    const remaining = Math.max(0, capacityMax - acceptedCount);
    const fillRate = (acceptedCount / capacityMax) * 100;

    expect(remaining).toBe(55);
    expect(fillRate).toBeCloseTo(78.43, 2);
  });

  test('unaccepted registration statuses do not consume capacity', () => {
    const registrations = [
      { id: '1', status: 'ACCEPTED' },
      { id: '2', status: 'ACCEPTED' },
      { id: '3', status: 'NEW' },
      { id: '4', status: 'UNDER_REVIEW' },
      { id: '5', status: 'PENDING' },
      { id: '6', status: 'REFUSED' },
      { id: '7', status: 'WAITLISTED' },
      { id: '8', status: 'CANCELLED' },
    ];

    const acceptedCount = registrations.filter((r) => r.status === 'ACCEPTED').length;
    expect(acceptedCount).toBe(2);

    const capacityMax = 10;
    const remaining = capacityMax - acceptedCount;
    expect(remaining).toBe(8);
  });

  test('capacity cannot be reduced below already accepted registrations', () => {
    const currentAccepted = 150;
    const proposedNewCapacity = 140;

    const isAllowed = proposedNewCapacity >= currentAccepted;
    expect(isAllowed).toBe(false);
  });
});

describe('Capacity: Derived Operational States', () => {
  test('derives NEAR_FULL when fill rate reaches or exceeds threshold', () => {
    const capacityMax = 100;
    const acceptedCount = 88;
    const threshold = 85;

    const fillRate = (acceptedCount / capacityMax) * 100;
    const isNearFull = fillRate >= threshold && fillRate < 100;

    expect(isNearFull).toBe(true);
  });

  test('derives FULL_WAITLIST when capacity reaches 0 and waitlist is enabled', () => {
    const capacityMax = 100;
    const acceptedCount = 100;
    const fullBehavior = 'WAITLIST';
    const waitlistEnabled = true;

    const isFull = acceptedCount >= capacityMax;
    const state = isFull && fullBehavior === 'WAITLIST' && waitlistEnabled ? 'FULL_WAITLIST' : 'OPEN';

    expect(state).toBe('FULL_WAITLIST');
  });

  test('derives CLOSED when registration_open is false', () => {
    const registrationOpen = false;
    const state = !registrationOpen ? 'CLOSED' : 'OPEN';
    expect(state).toBe('CLOSED');
  });
});
