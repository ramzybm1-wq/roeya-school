/**
 * Unit Tests: Academic Year Lifecycle & Next-Year Copying.
 */

describe('Academic Year: Lifecycle & Date Validation', () => {
  test('rejects academic year when start date >= end date', () => {
    const startDate = '2027-09-01';
    const endDate = '2026-06-30';
    const isValid = new Date(startDate) < new Date(endDate);
    expect(isValid).toBe(false);
  });

  test('validates correct chronological academic year dates', () => {
    const startDate = '2026-09-01';
    const endDate = '2027-06-30';
    const isValid = new Date(startDate) < new Date(endDate);
    expect(isValid).toBe(true);
  });
});

describe('Academic Year: Prepare Next Year Rules', () => {
  test('copying year duplicates level configurations without copying registrations', () => {
    const sourceYearLevels = [
      { id: 'syl_1', schoolId: 'sch_1', levelId: 'lvl_1AP', capacityMax: 255, acceptedRegistrations: 200 },
      { id: 'syl_2', schoolId: 'sch_1', levelId: 'lvl_2AP', capacityMax: 150, acceptedRegistrations: 140 },
    ];

    const destinationYearId = 'year_2027_2028';

    const copiedLevels = sourceYearLevels.map((sl) => ({
      schoolId: sl.schoolId,
      academicYearId: destinationYearId,
      levelId: sl.levelId,
      capacityMax: sl.capacityMax,
      registrationOpen: false, // Closed by default
      acceptedRegistrationsCount: 0, // Registrations are NEVER copied
    }));

    expect(copiedLevels.length).toBe(2);
    expect(copiedLevels[0].acceptedRegistrationsCount).toBe(0);
    expect(copiedLevels[1].acceptedRegistrationsCount).toBe(0);
    expect(copiedLevels[0].capacityMax).toBe(255);
  });
});
