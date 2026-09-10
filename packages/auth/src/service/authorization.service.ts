/**
 * Centralized Authorization Service for VISION SCHOOL.
 * Single source of truth for authorization checks, direct resource access,
 * multi-school scoping, and Last Super Admin protection rules.
 */

import { PermissionCode, User, UserRole } from '@vision-school/shared';
import { AuthGuard } from '../guard';

export interface AuthorizationContext {
  schoolId?: string;
  targetUserId?: string;
  targetUserRole?: UserRole;
  targetUserSchoolIds?: string[];
}

export interface AuthorizationResult {
  granted: boolean;
  reason?: string;
}

export class AuthorizationService {
  /**
   * Evaluates if an actor is authorized to perform an action within a given context.
   */
  static authorize(
    actor: User | null | undefined,
    permission: PermissionCode,
    context?: AuthorizationContext
  ): AuthorizationResult {
    if (!actor) {
      return { granted: false, reason: 'Utilisateur non authentifié.' };
    }

    if (actor.status !== 'ACTIVE') {
      return { granted: false, reason: `Compte utilisateur ${actor.status.toLowerCase()}.` };
    }

    // 1. Permission check
    if (!AuthGuard.hasPermission(actor, permission)) {
      return {
        granted: false,
        reason: `Permission requise manquante : ${permission}`,
      };
    }

    // 2. School-scoped access check (if context specifies a school)
    if (context?.schoolId) {
      if (!AuthGuard.canAccessSchool(actor, context.schoolId)) {
        return {
          granted: false,
          reason: 'Accès refusé pour cet établissement.',
        };
      }
    }

    // 3. Target user hierarchy check (if action manages another user)
    if (context?.targetUserRole && actor.role !== 'SUPER_ADMIN') {
      if (context.targetUserRole === 'SUPER_ADMIN') {
        return {
          granted: false,
          reason: 'Impossible de gérer un compte Super Administrateur.',
        };
      }

      if (context.targetUserSchoolIds && actor.allowedSchoolIds) {
        const sharesSchool = context.targetUserSchoolIds.some((id) =>
          actor.allowedSchoolIds.includes(id)
        );
        if (!sharesSchool) {
          return {
            granted: false,
            reason: 'Cet utilisateur n’appartient pas à vos établissements autorisés.',
          };
        }
      }
    }

    return { granted: true };
  }

  /**
   * Enforces the Last Super Admin rule:
   * Rejects any operation that would leave the platform with 0 active Super Admins.
   */
  static validateLastSuperAdminProtection(
    activeSuperAdminCount: number,
    targetUserRole: UserRole,
    operation: 'DEMOTE' | 'DISABLE' | 'SUSPEND' | 'DELETE'
  ): { allowed: boolean; error?: string } {
    if (targetUserRole !== 'SUPER_ADMIN') {
      return { allowed: true };
    }

    if (activeSuperAdminCount <= 1) {
      const verbMap: Record<string, string> = {
        DEMOTE: 'rétrograder',
        DISABLE: 'désactiver',
        SUSPEND: 'suspendre',
        DELETE: 'supprimer',
      };
      const verb = verbMap[operation] || 'modifier';
      return {
        allowed: false,
        error: `Action impossible : vous ne pouvez pas ${verb} le dernier Super Administrateur actif de la plateforme.`,
      };
    }

    return { allowed: true };
  }
}
