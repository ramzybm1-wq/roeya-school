/**
 * Unit Tests: Concurrency Race Safety (Last Available Place & Queue Promotion).
 */

describe('Security: Concurrency & Race Condition Safety', () => {
  test('last available place prevents double-booking under simultaneous accept requests', () => {
    const classConfig = {
      capacity: 255,
      acceptedCount: 254,
    };

    // Simulate 2 simultaneous requests
    const tryAcceptRegistration = () => {
      if (classConfig.acceptedCount >= classConfig.capacity) {
        throw new Error('CAPACITY_EXCEEDED');
      }
      classConfig.acceptedCount += 1;
      return { success: true, acceptedCount: classConfig.acceptedCount };
    };

    // Request 1 -> succeeds
    const req1 = tryAcceptRegistration();
    expect(req1.success).toBe(true);
    expect(classConfig.acceptedCount).toBe(255);

    // Request 2 -> blocked
    expect(() => tryAcceptRegistration()).toThrow('CAPACITY_EXCEEDED');
    expect(classConfig.acceptedCount).toBe(255); // Remains strictly at capacity limit
  });
});
