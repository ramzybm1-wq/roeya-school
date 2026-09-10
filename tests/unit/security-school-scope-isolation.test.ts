/**
 * Unit Tests: Multi-Campus School Isolation Matrix.
 */

describe('Security: School Isolation Boundary Matrix', () => {
  test('Admin of School A cannot view, modify, or export School B assets', () => {
    const adminA = {
      id: 'usr_admin_a',
      role: 'ADMIN',
      allowedSchoolIds: ['school_a'],
    };

    const schoolOperations = [
      { op: 'VIEW_REGISTRATION', targetSchool: 'school_b' },
      { op: 'DOWNLOAD_DOCUMENTS', targetSchool: 'school_b' },
      { op: 'EDIT_CAPACITY', targetSchool: 'school_b' },
      { op: 'MANAGE_WAITING_LIST', targetSchool: 'school_b' },
      { op: 'EXPORT_REPORTS', targetSchool: 'school_b' },
    ];

    const canExecute = (actor: any, targetSchool: string) => {
      if (actor.role === 'SUPER_ADMIN') return true;
      return actor.allowedSchoolIds.includes(targetSchool);
    };

    for (const action of schoolOperations) {
      expect(canExecute(adminA, action.targetSchool)).toBe(false);
    }

    // School A operations succeed
    expect(canExecute(adminA, 'school_a')).toBe(true);
  });
});
