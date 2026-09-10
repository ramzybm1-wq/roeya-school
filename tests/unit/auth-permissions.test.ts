/**
 * Unit Tests: RBAC Permission Matrix and Guards.
 */

import { User } from '@vision-school/shared';
import { AuthGuard, ROLE_PERMISSIONS } from '@vision-school/auth';

const superAdmin: User = {
  id: 'usr_001', email: 'super@school.dz', firstName: 'Nadia', lastName: 'Bouzid',
  role: 'SUPER_ADMIN', status: 'ACTIVE', allowedSchoolIds: [],
  isTwoFactorEnabled: true, createdAt: '', updatedAt: '',
};

const schoolAdmin: User = {
  id: 'usr_002', email: 'admin@school.dz', firstName: 'Yasmine', lastName: 'M',
  role: 'ADMIN', status: 'ACTIVE', allowedSchoolIds: ['school_hydra_01'],
  isTwoFactorEnabled: false, createdAt: '', updatedAt: '',
};

const agent: User = {
  id: 'usr_003', email: 'agent@school.dz', firstName: 'Ali', lastName: 'K',
  role: 'AGENT', status: 'ACTIVE', allowedSchoolIds: ['school_hydra_01'],
  isTwoFactorEnabled: false, createdAt: '', updatedAt: '',
};

const inactiveUser: User = {
  ...agent, id: 'usr_004', status: 'SUSPENDED',
};

describe('AuthGuard.hasPermission', () => {
  test('SUPER_ADMIN has all permissions', () => {
    expect(AuthGuard.hasPermission(superAdmin, 'registration.accept')).toBe(true);
    expect(AuthGuard.hasPermission(superAdmin, 'security.manage')).toBe(true);
    expect(AuthGuard.hasPermission(superAdmin, 'users.manage')).toBe(true);
  });

  test('ADMIN has role-level permissions', () => {
    expect(AuthGuard.hasPermission(schoolAdmin, 'registration.read')).toBe(true);
    expect(AuthGuard.hasPermission(schoolAdmin, 'registration.accept')).toBe(true);
    expect(AuthGuard.hasPermission(schoolAdmin, 'capacity.manage')).toBe(true);
  });

  test('ADMIN lacks SUPER_ADMIN-only permissions', () => {
    expect(AuthGuard.hasPermission(schoolAdmin, 'users.manage')).toBe(false);
    expect(AuthGuard.hasPermission(schoolAdmin, 'settings.manage')).toBe(false);
  });

  test('AGENT has limited permissions', () => {
    expect(AuthGuard.hasPermission(agent, 'registration.read')).toBe(true);
    expect(AuthGuard.hasPermission(agent, 'registration.accept')).toBe(false);
    expect(AuthGuard.hasPermission(agent, 'capacity.manage')).toBe(false);
  });

  test('inactive user is denied all permissions', () => {
    expect(AuthGuard.hasPermission(inactiveUser, 'registration.read')).toBe(false);
  });
});

describe('AuthGuard.canAccessSchool', () => {
  test('SUPER_ADMIN can access any school', () => {
    expect(AuthGuard.canAccessSchool(superAdmin, 'school_hydra_01')).toBe(true);
    expect(AuthGuard.canAccessSchool(superAdmin, 'school_elbiar_02')).toBe(true);
  });

  test('scoped ADMIN can only access assigned school', () => {
    expect(AuthGuard.canAccessSchool(schoolAdmin, 'school_hydra_01')).toBe(true);
    expect(AuthGuard.canAccessSchool(schoolAdmin, 'school_elbiar_02')).toBe(false);
  });
});

describe('ROLE_PERMISSIONS matrix', () => {
  test('SUPER_ADMIN has the most permissions', () => {
    expect(ROLE_PERMISSIONS.SUPER_ADMIN.length).toBeGreaterThan(ROLE_PERMISSIONS.ADMIN.length);
  });

  test('ADMIN has more permissions than AGENT', () => {
    expect(ROLE_PERMISSIONS.ADMIN.length).toBeGreaterThan(ROLE_PERMISSIONS.AGENT.length);
  });
});
