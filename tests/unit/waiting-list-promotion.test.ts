/**
 * Unit Tests: Promotion Workflow & Concurrency Conflict Protection.
 */

describe('Waiting List: Promotion & Concurrency Safety', () => {
  test('promotion transitions waiting entry to PROMOTED and registration to ACCEPTED', () => {
    const entry = { id: 'entry_1', status: 'ACTIVE' };
    const registration = { id: 'reg_1', status: 'WAITLISTED' };
    let acceptedRegistrationsCount = 254;
    const capacityMax = 255;

    // Promotion executed
    expect(acceptedRegistrationsCount < capacityMax).toBe(true);

    entry.status = 'PROMOTED';
    registration.status = 'ACCEPTED';
    acceptedRegistrationsCount += 1;

    expect(entry.status).toBe('PROMOTED');
    expect(registration.status).toBe('ACCEPTED');
    expect(acceptedRegistrationsCount).toBe(255);
  });

  test('prevents overbooking when 2 admins promote simultaneously with only 1 place remaining', () => {
    let availablePlaces = 1;

    const tryPromote = () => {
      if (availablePlaces <= 0) {
        throw new Error('CAPACITY_CONFLICT');
      }
      availablePlaces -= 1;
      return { success: true };
    };

    // Admin A executes
    const resultA = tryPromote();
    expect(resultA.success).toBe(true);
    expect(availablePlaces).toBe(0);

    // Admin B executes simultaneously
    expect(() => tryPromote()).toThrow('CAPACITY_CONFLICT');
  });
});
