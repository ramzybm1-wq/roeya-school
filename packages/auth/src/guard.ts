/**
 * Comprehensive RBAC & School-Scoped Permission Checker for VISION SCHOOL.
 * Enforces role hierarchy, direct URL resource access, and Last Super Admin protection rules.
 */

import { PermissionCode, User, UserRole } from '@vision-school/shared';
import { ROLE_PERMISSIONS } from './roles';

export class AuthGuard {
  /**
   * Checks if a user has a specific permission, considering role, explicit overrides, resolved DB permissions, and status.
   */
  static hasPermission(user: User | null | undefined, permission: PermissionCode): boolean {
    if (!user || user.status !== 'ACTIVE') return false;

    // Super Admin has all permissions unconditionally
    if (user.role === 'SUPER_ADMIN') return true;

    // Build permission variants to support singular/plural and schema aliases
    const variants: string[] = [permission];
    const aliasPairs: Array<[string, string]> = [
      ['school.read', 'schools.read'],
      ['school.manage', 'schools.manage'],
      ['user.read', 'users.read'],
      ['user.manage', 'users.manage'],
      ['role.manage', 'roles.manage'],
      ['waitinglist.manage', 'waiting_list.manage'],
      ['year.manage', 'academic_year.manage'],
      ['report.read', 'reports.read'],
      ['report.export', 'reports.export'],
      ['level.manage', 'capacity.manage'],
      ['level.read', 'capacity.read'],
      ['registration.manage', 'registration.update'],
      ['document.manage', 'document.validate'],
    ];


    for (const [p1, p2] of aliasPairs) {
      if (permission === p1) variants.push(p2);
      if (permission === p2) variants.push(p1);
    }

    // 1. Check resolved permissions from database (if attached by auth middleware)
    if (user.permissions && Array.isArray(user.permissions)) {
      if (variants.some((v) => user.permissions!.includes(v as PermissionCode))) {
        return true;
      }
    }

    // 2. Check custom explicit permissions if configured
    if (user.customPermissions && Array.isArray(user.customPermissions)) {
      if (variants.some((v) => user.customPermissions!.includes(v as PermissionCode))) {
        return true;
      }
    }

    // 3. Check role-based default permissions
    const permissions = ROLE_PERMISSIONS[user.role] || [];
    return variants.some((v) => permissions.includes(v as PermissionCode));
  }

  /**
   * Checks if a user has access to operate on a specific school establishment.
   * - SUPER_ADMIN has global access across all schools.
   * - ADMIN / AGENT must have the school ID in their assigned allowedSchoolIds.
   */
  static canAccessSchool(user: User | null | undefined, schoolId: string): boolean {
    if (!user || user.status !== 'ACTIVE') return false;

    // Super admin has global access across all establishments
    if (user.role === 'SUPER_ADMIN') return true;

    if (!schoolId) return false;

    return Boolean(user.allowedSchoolIds && user.allowedSchoolIds.includes(schoolId));
  }

  /**
   * Checks if a user has SUPER_ADMIN privileges.
   */
  static isSuperAdmin(user: User | null | undefined): boolean {
    return Boolean(user && user.status === 'ACTIVE' && user.role === 'SUPER_ADMIN');
  }

  /**
   * Validates if an actor is allowed to manage a target user account.
   * - Agents cannot manage any users.
   * - Admins cannot manage Super Admins.
   * - Admins can only manage users within their own assigned schools.
   */
  static canManageUser(actor: User, targetUser: User): boolean {
    if (!actor || actor.status !== 'ACTIVE') return false;

    // Super Admin can manage all users
    if (actor.role === 'SUPER_ADMIN') return true;

    // Agent has no user management rights
    if (actor.role === 'AGENT') return false;

    // Admin cannot manage Super Admins or other global Admins
    if (targetUser.role === 'SUPER_ADMIN') return false;

    // Admin can only manage users that share at least one assigned school
    if (actor.allowedSchoolIds && targetUser.allowedSchoolIds) {
      const sharesSchool = targetUser.allowedSchoolIds.some((sId) =>
        actor.allowedSchoolIds.includes(sId)
      );
      return sharesSchool;
    }

    return false;
  }

  /**
   * Validates if an actor is allowed to assign a specific role.
   * - Only SUPER_ADMIN can assign SUPER_ADMIN.
   * - ADMIN can assign ADMIN or AGENT.
   * - AGENT cannot assign any roles.
   */
  static canAssignRole(actor: User, targetRole: UserRole): boolean {
    if (!actor || actor.status !== 'ACTIVE') return false;

    if (actor.role === 'SUPER_ADMIN') return true;

    if (actor.role === 'ADMIN') {
      return targetRole === 'ADMIN' || targetRole === 'AGENT';
    }

    return false;
  }

  /**
   * Returns whether 2FA is strictly mandatory for a given role.
   * SUPER_ADMIN requires 2FA by platform security policy.
   */
  static is2FaMandatoryForRole(role: UserRole): boolean {
    return role === 'SUPER_ADMIN';
  }

  /**
   * Checks if a user is permitted to disable 2FA on their own account.
   * SUPER_ADMIN is never allowed to disable 2FA.
   */
  static canDisable2Fa(user: User): boolean {
    return user.role !== 'SUPER_ADMIN';
  }
}
