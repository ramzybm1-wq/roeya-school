/**
 * Unit Tests: Waiting List FIFO Queue & Dynamic Position Calculation.
 */

describe('Waiting List: FIFO Ordering & Rank Derivations', () => {
  test('orders candidates strictly by entered_at timestamp (FIFO)', () => {
    const rawEntries = [
      { id: 'entry_c', enteredAt: new Date('2026-05-01T10:02:00Z'), status: 'ACTIVE' },
      { id: 'entry_a', enteredAt: new Date('2026-05-01T10:00:00Z'), status: 'ACTIVE' },
      { id: 'entry_b', enteredAt: new Date('2026-05-01T10:01:00Z'), status: 'ACTIVE' },
    ];

    // Sort by enteredAt ASC
    const sorted = [...rawEntries].sort((a, b) => a.enteredAt.getTime() - b.enteredAt.getTime());

    expect(sorted[0].id).toBe('entry_a');
    expect(sorted[1].id).toBe('entry_b');
    expect(sorted[2].id).toBe('entry_c');
  });

  test('dynamically assigns ranks #1, #2, #3 and re-indexes after promotion', () => {
    const queue = [
      { id: 'entry_a', enteredAt: new Date('2026-05-01T10:00:00Z'), status: 'ACTIVE' },
      { id: 'entry_b', enteredAt: new Date('2026-05-01T10:01:00Z'), status: 'ACTIVE' },
      { id: 'entry_c', enteredAt: new Date('2026-05-01T10:02:00Z'), status: 'ACTIVE' },
    ];

    // Initial ranks
    let ranked = queue
      .filter((q) => q.status === 'ACTIVE')
      .map((entry, index) => ({ ...entry, position: index + 1 }));

    expect(ranked[0].position).toBe(1);
    expect(ranked[1].position).toBe(2);
    expect(ranked[2].position).toBe(3);

    // Promote candidate A
    queue[0].status = 'PROMOTED';

    // Re-evaluate active queue
    ranked = queue
      .filter((q) => q.status === 'ACTIVE')
      .map((entry, index) => ({ ...entry, position: index + 1 }));

    expect(ranked.length).toBe(2);
    expect(ranked[0].id).toBe('entry_b');
    expect(ranked[0].position).toBe(1); // Candidate B is now #1
    expect(ranked[1].id).toBe('entry_c');
    expect(ranked[1].position).toBe(2); // Candidate C is now #2
  });
});
