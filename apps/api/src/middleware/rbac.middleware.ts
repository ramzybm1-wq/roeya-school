/**
 * Role-Based Access Control (RBAC) & School-Scoped Permission Middleware.
 * Enforces authentication, permission checks, school isolation, and Super Admin boundaries.
 */

import { Request, Response, NextFunction } from 'express';
import { PermissionCode, AppError } from '@vision-school/shared';
import { AuthGuard, AuthorizationService } from '@vision-school/auth';

/**
 * Ensures the request is from an authenticated staff member.
 */
export function requireAuth() {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw AppError.unauthorized('Authentification requise pour accéder à cette ressource.');
    }
    next();
  };
}

/**
 * Ensures the user has a specific permission.
 */
export function requirePermission(permission: PermissionCode) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw AppError.unauthorized('Authentification requise.');
    }

    const authResult = AuthorizationService.authorize(req.user, permission);
    if (!authResult.granted) {
      throw AppError.forbidden(authResult.reason || 'Accès refusé.');
    }

    next();
  };
}

/**
 * Ensures the user has access to a specific school (e.g. from params, query, or body).
 */
export function requireSchoolAccess(
  schoolIdExtractor?: (req: Request) => string | undefined
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw AppError.unauthorized('Authentification requise.');
    }

    const schoolId = schoolIdExtractor
      ? schoolIdExtractor(req)
      : (req.params.schoolId || req.query.schoolId || req.body.schoolId);

    if (schoolId) {
      const canAccess = AuthGuard.canAccessSchool(req.user, String(schoolId));
      if (!canAccess) {
        throw AppError.forbidden('Accès refusé pour cet établissement scolaire.');
      }
    }

    next();
  };
}

/**
 * Ensures the user is a SUPER_ADMIN.
 */
export function requireSuperAdmin() {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw AppError.unauthorized('Authentification requise.');
    }

    if (!AuthGuard.isSuperAdmin(req.user)) {
      throw AppError.forbidden('Cette action est strictement réservée aux Super Administrateurs.');
    }

    next();
  };
}

/**
 * Ensures the user has at least one of the specified permissions.
 */
export function requireAnyPermission(permissionsList: PermissionCode[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw AppError.unauthorized('Authentification requise.');
    }

    const hasAny = permissionsList.some((p) => AuthGuard.hasPermission(req.user!, p));
    if (!hasAny) {
      throw AppError.forbidden('Permissions insuffisantes pour effectuer cette opération.');
    }

    next();
  };
}
