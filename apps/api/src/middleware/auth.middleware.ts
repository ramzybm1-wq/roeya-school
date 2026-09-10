/**
 * Admin Authentication Middleware.
 * Validates session cookies and Bearer tokens, enforcing active session state and attaching user context.
 */

import { Request, Response, NextFunction } from 'express';
import { getDb } from '@vision-school/database';
import { users, userRoles, roles, userSchoolAccess } from '@vision-school/database';
import { eq } from 'drizzle-orm';
import { AppError, User, UserRole, PermissionCode } from '@vision-school/shared';
import { AdminSessionService } from '../services/admin-session.service';
import { AdminAuthService } from '../services/admin-auth.service';

export interface AuthenticatedUserContext extends User {
  sessionId: string;
  permissions: PermissionCode[];
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUserContext;
      sessionId?: string;
    }
  }
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // 1. Extract token from Bearer header or Cookie
    let token: string | undefined;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    } else if (req.query && typeof req.query.token === 'string') {
      token = (req.query.token as string).trim();
    } else if (req.headers.cookie) {
      const matchAdmin = req.headers.cookie.match(/vs_admin_session=([^;]+)/);
      const matchClient = req.headers.cookie.match(/vs_client_session=([^;]+)/);
      if (matchAdmin) {
        token = matchAdmin[1].trim();
      } else if (matchClient) {
        token = matchClient[1].trim();
      }
    }

    if (!token) {
      return next();
    }

    // 2. Validate session via AdminSessionService
    const sessionValidation = await AdminSessionService.validateSession(token);
    if (!sessionValidation.valid || !sessionValidation.userId || !sessionValidation.sessionId) {
      return next();
    }

    // 3. Load user details
    const db = getDb();
    const [user] = await db.select().from(users).where(eq(users.id, sessionValidation.userId));
    if (!user || user.status !== 'ACTIVE') {
      return next();
    }

    // 4. Load roles and permissions
    const userRoleRows = await db
      .select({ code: roles.code })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(eq(userRoles.userId, user.id));

    const primaryRole: UserRole = (userRoleRows[0]?.code as UserRole) || 'AGENT';

    const schoolRows = await db
      .select({ schoolId: userSchoolAccess.schoolId })
      .from(userSchoolAccess)
      .where(eq(userSchoolAccess.userId, user.id));

    const allowedSchoolIds = schoolRows.map((r) => r.schoolId);
    const resolvedPermissions = await AdminAuthService.getResolvedPermissions(user.id, primaryRole);

    req.sessionId = sessionValidation.sessionId;
    req.user = {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: primaryRole,
      status: user.status as any,
      allowedSchoolIds,
      isTwoFactorEnabled: user.isTwoFactorEnabled,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
      sessionId: sessionValidation.sessionId,
      permissions: resolvedPermissions,
    };

    next();
  } catch (error) {
    next(error);
  }
}
