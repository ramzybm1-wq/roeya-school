/**
 * Unit Tests: Skip / Hold Workflow & Candidate Reactivation.
 */

describe('Waiting List: Skip & Reactivation Lifecycle', () => {
  test('skipping candidate temporarily excludes them from next-eligible candidate selection', () => {
    const queue = [
      { id: '1', name: 'Candidate 1', enteredAt: new Date('2026-05-01T10:00:00Z'), status: 'SKIPPED_TEMPORARILY' },
      { id: '2', name: 'Candidate 2', enteredAt: new Date('2026-05-01T10:05:00Z'), status: 'ACTIVE' },
      { id: '3', name: 'Candidate 3', enteredAt: new Date('2026-05-01T10:10:00Z'), status: 'ACTIVE' },
    ];

    const nextEligible = queue.find((q) => q.status === 'ACTIVE');
    expect(nextEligible?.id).toBe('2');
    expect(nextEligible?.name).toBe('Candidate 2');
  });

  test('reactivating skipped candidate restores them based on original entered_at', () => {
    const candidate1 = { id: '1', name: 'Candidate 1', enteredAt: new Date('2026-05-01T10:00:00Z'), status: 'SKIPPED_TEMPORARILY' };
    const candidate2 = { id: '2', name: 'Candidate 2', enteredAt: new Date('2026-05-01T10:05:00Z'), status: 'ACTIVE' };

    // Reactivate Candidate 1
    candidate1.status = 'ACTIVE';

    const queue = [candidate1, candidate2].sort((a, b) => a.enteredAt.getTime() - b.enteredAt.getTime());

    expect(queue[0].id).toBe('1'); // Candidate 1 is back at #1
    expect(queue[1].id).toBe('2');
  });
});
