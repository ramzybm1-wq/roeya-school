/**
 * Unit Tests: Multi-School Scoping & Direct URL Protection.
 */

import { AuthGuard, AuthorizationService } from '@vision-school/auth';
import { User } from '@vision-school/shared';

const hydraSchoolId = 'school_hydra_01';
const elBiarSchoolId = 'school_elbiar_02';

const superAdmin: User = {
  id: 'usr_super', email: 'super@school.dz', firstName: 'Nadia', lastName: 'B',
  role: 'SUPER_ADMIN', status: 'ACTIVE', allowedSchoolIds: [],
  isTwoFactorEnabled: true, createdAt: '', updatedAt: '',
};

const hydraAdmin: User = {
  id: 'usr_admin_hydra', email: 'admin.hydra@school.dz', firstName: 'Yasmine', lastName: 'M',
  role: 'ADMIN', status: 'ACTIVE', allowedSchoolIds: [hydraSchoolId],
  isTwoFactorEnabled: false, createdAt: '', updatedAt: '',
};

const elBiarAgent: User = {
  id: 'usr_agent_elbiar', email: 'agent.elbiar@school.dz', firstName: 'Karim', lastName: 'H',
  role: 'AGENT', status: 'ACTIVE', allowedSchoolIds: [elBiarSchoolId],
  isTwoFactorEnabled: false, createdAt: '', updatedAt: '',
};

describe('AuthGuard: School Access Scoping', () => {
  test('SUPER_ADMIN has global access across all schools', () => {
    expect(AuthGuard.canAccessSchool(superAdmin, hydraSchoolId)).toBe(true);
    expect(AuthGuard.canAccessSchool(superAdmin, elBiarSchoolId)).toBe(true);
    expect(AuthGuard.canAccessSchool(superAdmin, 'any_random_school_id')).toBe(true);
  });

  test('Hydra Admin has access to Hydra, but NOT El Biar', () => {
    expect(AuthGuard.canAccessSchool(hydraAdmin, hydraSchoolId)).toBe(true);
    expect(AuthGuard.canAccessSchool(hydraAdmin, elBiarSchoolId)).toBe(false);
  });

  test('El Biar Agent has access to El Biar, but NOT Hydra', () => {
    expect(AuthGuard.canAccessSchool(elBiarAgent, elBiarSchoolId)).toBe(true);
    expect(AuthGuard.canAccessSchool(elBiarAgent, hydraSchoolId)).toBe(false);
  });
});

describe('AuthorizationService: Direct Resource & Action Scoping', () => {
  test('Hydra Admin is authorized to read registration from Hydra', () => {
    const result = AuthorizationService.authorize(hydraAdmin, 'registration.read', {
      schoolId: hydraSchoolId,
    });
    expect(result.granted).toBe(true);
  });

  test('Hydra Admin is strictly FORBIDDEN from reading registration from El Biar', () => {
    const result = AuthorizationService.authorize(hydraAdmin, 'registration.read', {
      schoolId: elBiarSchoolId,
    });
    expect(result.granted).toBe(false);
    expect(result.reason).toContain('Accès refusé pour cet établissement.');
  });

  test('Super Admin is authorized to access resources across any school', () => {
    const hydraResult = AuthorizationService.authorize(superAdmin, 'registration.accept', {
      schoolId: hydraSchoolId,
    });
    const elBiarResult = AuthorizationService.authorize(superAdmin, 'registration.accept', {
      schoolId: elBiarSchoolId,
    });

    expect(hydraResult.granted).toBe(true);
    expect(elBiarResult.granted).toBe(true);
  });

  test('Agent without accept permission is rejected even for their own school', () => {
    const result = AuthorizationService.authorize(elBiarAgent, 'registration.accept', {
      schoolId: elBiarSchoolId,
    });
    expect(result.granted).toBe(false);
    expect(result.reason).toContain('Permission requise manquante');
  });
});
