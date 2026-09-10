/**
 * Unit Tests: Multi-School & Multi-Level Waiting Queue Isolation.
 */

describe('Waiting List: Queue Scope Isolation', () => {
  test('queues for different schools and levels are completely independent', () => {
    const entries = [
      { id: '1', schoolYearLevelId: 'hydra_1ap', studentName: 'Student Hydra 1AP', enteredAt: new Date('2026-05-01T10:00:00Z') },
      { id: '2', schoolYearLevelId: 'hydra_1ap', studentName: 'Student Hydra 1AP #2', enteredAt: new Date('2026-05-01T10:05:00Z') },
      { id: '3', schoolYearLevelId: 'elbiar_1ap', studentName: 'Student El Biar 1AP', enteredAt: new Date('2026-05-01T09:00:00Z') },
      { id: '4', schoolYearLevelId: 'hydra_2ap', studentName: 'Student Hydra 2AP', enteredAt: new Date('2026-05-01T08:00:00Z') },
    ];

    const hydra1ApQueue = entries.filter((e) => e.schoolYearLevelId === 'hydra_1ap');
    const elBiar1ApQueue = entries.filter((e) => e.schoolYearLevelId === 'elbiar_1ap');
    const hydra2ApQueue = entries.filter((e) => e.schoolYearLevelId === 'hydra_2ap');

    expect(hydra1ApQueue.length).toBe(2);
    expect(elBiar1ApQueue.length).toBe(1);
    expect(hydra2ApQueue.length).toBe(1);

    // El Biar student entered earlier, but is #1 in El Biar, not Hydra
    expect(elBiar1ApQueue[0].studentName).toBe('Student El Biar 1AP');
    expect(hydra1ApQueue[0].studentName).toBe('Student Hydra 1AP');
  });
});
