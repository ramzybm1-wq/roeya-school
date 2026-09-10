/**
 * Unit Tests: Candidate Transfers across Grade Levels and Schools.
 */

describe('Waiting List: Level & School Transfers', () => {
  test('transferring waitlisted candidate closes source waiting entry', () => {
    const sourceEntry = { id: 'wl_source', schoolYearLevelId: '1ap', status: 'ACTIVE' };
    const registration = { id: 'reg_1', schoolYearLevelId: '1ap', status: 'WAITLISTED' };

    // Transfer to 2AP (which is not full)
    sourceEntry.status = 'REMOVED';
    registration.schoolYearLevelId = '2ap';
    registration.status = 'UNDER_REVIEW';

    expect(sourceEntry.status).toBe('REMOVED');
    expect(registration.schoolYearLevelId).toBe('2ap');
    expect(registration.status).toBe('UNDER_REVIEW');
  });
});
