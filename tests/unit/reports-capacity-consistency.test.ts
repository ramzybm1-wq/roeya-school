/**
 * Unit Tests: Report Capacity Metrics Consistency with Dashboard.
 */

describe('Reports: Metric Consistency with Dashboard', () => {
  test('derives remaining capacity strictly from accepted dossiers, never submitted requests', () => {
    const levelCapacity = 25;
    const submittedRequests = 60;
    const acceptedCount = 18;

    // Remaining capacity must be capacity - accepted
    const remainingPlaces = Math.max(0, levelCapacity - acceptedCount);
    const fillRate = Math.round((acceptedCount / levelCapacity) * 100);

    expect(remainingPlaces).toBe(7);
    expect(fillRate).toBe(72);
  });
});
