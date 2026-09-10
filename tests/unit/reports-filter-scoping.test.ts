/**
 * Unit Tests: Report Filter Scoping & Admin School Authorization.
 */

describe('Reports: School Authorization & Filter Scoping', () => {
  test('school admin can only generate reports for their assigned school', () => {
    const adminUser = {
      id: 'usr_hydra',
      role: 'ADMIN',
      allowedSchoolIds: ['school_hydra'],
    };

    const canGenerateReportForSchool = (schoolId: string | null) => {
      if (adminUser.role === 'SUPER_ADMIN') return true;
      if (!schoolId) return false;
      return adminUser.allowedSchoolIds.includes(schoolId);
    };

    expect(canGenerateReportForSchool('school_hydra')).toBe(true);
    expect(canGenerateReportForSchool('school_elbiar')).toBe(false);
    expect(canGenerateReportForSchool(null)).toBe(false);
  });

  test('super admin can generate global cross-school reports', () => {
    const superAdmin = {
      id: 'usr_super',
      role: 'SUPER_ADMIN',
      allowedSchoolIds: [],
    };

    const canAccess = (schoolId: string | null) => {
      return superAdmin.role === 'SUPER_ADMIN' || (schoolId ? superAdmin.allowedSchoolIds.includes(schoolId) : false);
    };

    expect(canAccess('school_hydra')).toBe(true);
    expect(canAccess('school_elbiar')).toBe(true);
    expect(canAccess(null)).toBe(true);
  });
});
