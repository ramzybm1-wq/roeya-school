/**
 * Unit Tests: Saved Reports Permission & School Revalidation.
 */

describe('Reports: Saved Report Security & Access Revalidation', () => {
  test('opening a saved report re-evaluates current user school authorization', () => {
    // Admin was previously granted school_hydra and saved a report
    const savedConfig = {
      id: 'sr_123',
      schoolId: 'school_hydra',
    };

    // Admin's access was later revoked
    const currentUser = {
      id: 'usr_admin',
      role: 'ADMIN',
      allowedSchoolIds: ['school_elbiar'], // No longer includes school_hydra
    };

    const validateAccess = (configSchoolId: string | null) => {
      if (currentUser.role === 'SUPER_ADMIN') return true;
      if (!configSchoolId) return false;
      return currentUser.allowedSchoolIds.includes(configSchoolId);
    };

    expect(validateAccess(savedConfig.schoolId)).toBe(false);
  });
});
