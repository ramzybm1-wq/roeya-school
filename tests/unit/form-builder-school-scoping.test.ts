/**
 * Unit Tests: Multi-School Admin Scoping for Form Builder.
 */

describe('Form Builder Scoping: Admin School Authorization', () => {
  test('school admin can customize their assigned school form but not other schools', () => {
    const adminUser = {
      id: 'admin_hydra',
      role: 'ADMIN',
      allowedSchoolIds: ['school_hydra'],
    };

    const canManageForm = (targetSchoolId: string | null) => {
      if (adminUser.role === 'SUPER_ADMIN') return true;
      if (!targetSchoolId) return false; // Global forms restricted to Super Admin
      return adminUser.allowedSchoolIds.includes(targetSchoolId);
    };

    expect(canManageForm('school_hydra')).toBe(true);
    expect(canManageForm('school_elbiar')).toBe(false);
    expect(canManageForm(null)).toBe(false);
  });
});
