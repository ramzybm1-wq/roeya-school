/**
 * Unit Tests: Last Super Admin Protection Safeguards.
 */

import { AuthorizationService } from '@vision-school/auth';

describe('AuthorizationService: Last Super Admin Protection', () => {
  test('blocks disabling the last active Super Admin (count = 1)', () => {
    const result = AuthorizationService.validateLastSuperAdminProtection(1, 'SUPER_ADMIN', 'DISABLE');
    expect(result.allowed).toBe(false);
    expect(result.error).toContain('vous ne pouvez pas désactiver le dernier Super Administrateur');
  });

  test('blocks demoting the last active Super Admin (count = 1)', () => {
    const result = AuthorizationService.validateLastSuperAdminProtection(1, 'SUPER_ADMIN', 'DEMOTE');
    expect(result.allowed).toBe(false);
    expect(result.error).toContain('vous ne pouvez pas rétrograder le dernier Super Administrateur');
  });

  test('blocks suspending the last active Super Admin (count = 1)', () => {
    const result = AuthorizationService.validateLastSuperAdminProtection(1, 'SUPER_ADMIN', 'SUSPEND');
    expect(result.allowed).toBe(false);
    expect(result.error).toContain('vous ne pouvez pas suspendre le dernier Super Administrateur');
  });

  test('blocks deleting the last active Super Admin (count = 1)', () => {
    const result = AuthorizationService.validateLastSuperAdminProtection(1, 'SUPER_ADMIN', 'DELETE');
    expect(result.allowed).toBe(false);
    expect(result.error).toContain('vous ne pouvez pas supprimer le dernier Super Administrateur');
  });

  test('allows disabling a Super Admin if another active Super Admin remains (count >= 2)', () => {
    const result = AuthorizationService.validateLastSuperAdminProtection(2, 'SUPER_ADMIN', 'DISABLE');
    expect(result.allowed).toBe(true);
    expect(result.error).toBeUndefined();
  });

  test('does not restrict actions on non-Super Admin roles (ADMIN or AGENT)', () => {
    const adminResult = AuthorizationService.validateLastSuperAdminProtection(1, 'ADMIN', 'DISABLE');
    const agentResult = AuthorizationService.validateLastSuperAdminProtection(1, 'AGENT', 'DEMOTE');

    expect(adminResult.allowed).toBe(true);
    expect(agentResult.allowed).toBe(true);
  });
});
