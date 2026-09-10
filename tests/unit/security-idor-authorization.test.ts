/**
 * Unit Tests: IDOR Prevention & Negative Authorization.
 */

describe('Security: IDOR & Negative Authorization', () => {
  test('blocks direct access to resource when requester is unauthenticated or lacks school permission', () => {
    const resources = [
      { id: 'reg_100', schoolId: 'school_hydra', studentName: 'Mohamed' },
      { id: 'reg_200', schoolId: 'school_elbiar', studentName: 'Karim' },
    ];

    const actor = {
      id: 'usr_admin_hydra',
      role: 'ADMIN',
      allowedSchoolIds: ['school_hydra'],
    };

    const getResource = (requester: any, resourceId: string) => {
      const res = resources.find((r) => r.id === resourceId);
      if (!res) throw new Error('NOT_FOUND');
      if (requester.role !== 'SUPER_ADMIN' && !requester.allowedSchoolIds.includes(res.schoolId)) {
        throw new Error('FORBIDDEN_IDOR_BLOCKED');
      }
      return res;
    };

    // Authorized access
    expect(getResource(actor, 'reg_100').studentName).toBe('Mohamed');

    // IDOR attempt blocked
    expect(() => getResource(actor, 'reg_200')).toThrow('FORBIDDEN_IDOR_BLOCKED');
  });
});
