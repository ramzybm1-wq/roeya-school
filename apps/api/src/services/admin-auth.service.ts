/**
 * Admin Authentication Service for VISION SCHOOL.
 * Handles credential verification, lockout protection, 2FA workflows,
 * password resets, and session issuance.
 */

import { getDb } from '@vision-school/database';
import {
  users,
  userRoles,
  roles,
  userSchoolAccess,
  rolePermissions,
  permissions,
  loginEvents,
  auditLogs,
} from '@vision-school/database';
import { eq, and, gt } from 'drizzle-orm';
import { PasswordSecurity, TokenSecurity, AuthGuard } from '@vision-school/auth';
import { AppError, PermissionCode, UserRole } from '@vision-school/shared';
import { AdminSessionService } from './admin-session.service';
import { AdminTwoFactorService } from './admin-two-factor.service';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes lockout
const PASSWORD_RESET_EXPIRY_MS = 60 * 60 * 1000; // 1 hour expiration

export interface AdminAuthResult {
  requires2Fa: boolean;
  challengeToken?: string;
  sessionToken?: string;
  sessionId?: string;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    permissions: PermissionCode[];
    allowedSchoolIds: string[];
    isTwoFactorEnabled: boolean;
  };
}

export class AdminAuthService {
  /**
   * Primary staff login entrypoint.
   */
  static async login(
    emailCandidate: string,
    passwordCandidate: string,
    ipAddress = '127.0.0.1',
    userAgent = 'Unknown'
  ): Promise<AdminAuthResult> {
    const email = (emailCandidate || '').trim().toLowerCase();
    const db = getDb();

    // 1. Fetch user by email
    const [user] = await db.select().from(users).where(eq(users.email, email));

    // Generic error to avoid account enumeration
    const genericAuthError = AppError.unauthorized('Adresse email ou mot de passe incorrect.');

    if (!user) {
      // Record failed attempt for non-existing email to security logs
      await db.insert(loginEvents).values({
        emailAttempted: email,
        eventType: 'LOGIN_FAILED',
        result: 'FAILURE',
        ipAddress,
        userAgent,
      });
      throw genericAuthError;
    }

    const now = new Date();

    // 2. Check if account is locked out from previous failed attempts
    if (user.lockedUntil && user.lockedUntil > now) {
      const minutesRemaining = Math.ceil((user.lockedUntil.getTime() - now.getTime()) / 60000);
      throw new AppError(
        `Compte temporairement verrouillé suite à plusieurs tentatives infructueuses. Veuillez réessayer dans ${minutesRemaining} minute(s).`,
        'RATE_LIMITED',
        423
      );
    }

    // 3. Check account lifecycle status
    if (user.status === 'INVITED') {
      throw new AppError(
        'Ce compte est en attente d’activation. Veuillez utiliser le lien reçu dans votre email d’invitation.',
        'FORBIDDEN',
        403
      );
    }
    if (user.status === 'SUSPENDED') {
      throw new AppError('Ce compte administrateur a été temporairement suspendu.', 'FORBIDDEN', 403);
    }
    if (user.status === 'DISABLED') {
      throw new AppError('Ce compte a été désactivé par un administrateur.', 'FORBIDDEN', 403);
    }

    // 4. Verify password
    if (!user.passwordHash) {
      throw genericAuthError;
    }

    const isPasswordValid = await PasswordSecurity.verify(passwordCandidate, user.passwordHash);
    if (!isPasswordValid) {
      const updatedFailedAttempts = user.failedLoginAttempts + 1;
      const shouldLock = updatedFailedAttempts >= MAX_FAILED_ATTEMPTS;
      const lockedUntil = shouldLock ? new Date(now.getTime() + LOCKOUT_DURATION_MS) : null;

      await db
        .update(users)
        .set({
          failedLoginAttempts: updatedFailedAttempts,
          lastFailedLoginAt: now,
          lockedUntil,
          updatedAt: now,
        })
        .where(eq(users.id, user.id));

      await db.insert(loginEvents).values({
        userId: user.id,
        emailAttempted: email,
        eventType: shouldLock ? 'ACCOUNT_LOCKED' : 'LOGIN_FAILED',
        result: 'FAILURE',
        ipAddress,
        userAgent,
      });

      if (shouldLock) {
        throw new AppError(
          'Compte temporairement verrouillé (15 minutes) suite à 5 tentatives infructueuses.',
          'RATE_LIMITED',
          423
        );
      }

      throw genericAuthError;
    }

    // 5. Resolve User Roles and Permissions
    const userRoleRows = await db
      .select({ code: roles.code })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(eq(userRoles.userId, user.id));

    const primaryRole: UserRole = (userRoleRows[0]?.code as UserRole) || 'AGENT';

    // 6. Check 2FA requirement
    const is2FaMandatory = AuthGuard.is2FaMandatoryForRole(primaryRole);
    const requires2Fa = is2FaMandatory || user.isTwoFactorEnabled;

    if (requires2Fa && user.isTwoFactorEnabled && user.twoFactorSecret) {
      // Issue short-lived 2FA challenge
      const challenge = await AdminTwoFactorService.createChallenge(user.id, ipAddress, userAgent);
      return {
        requires2Fa: true,
        challengeToken: challenge.challengeToken,
      };
    }

    // 7. Successful login (No 2FA or first-time setup needed)
    return this.finalizeSuccessfulLogin(user.id, primaryRole, ipAddress, userAgent);
  }

  /**
   * Completes 2FA challenge and issues session upon code validation.
   */
  static async verifyTwoFactor(
    challengeToken: string,
    code: string,
    ipAddress = '127.0.0.1',
    userAgent = 'Unknown'
  ): Promise<AdminAuthResult> {
    const result = await AdminTwoFactorService.verifyChallenge(challengeToken, code);
    const db = getDb();

    // Fetch user primary role
    const userRoleRows = await db
      .select({ code: roles.code })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(eq(userRoles.userId, result.userId));

    const primaryRole: UserRole = (userRoleRows[0]?.code as UserRole) || 'AGENT';

    await db.insert(loginEvents).values({
      userId: result.userId,
      eventType: 'TWO_FA_SUCCESS',
      result: 'SUCCESS',
      ipAddress,
      userAgent,
    });

    return this.finalizeSuccessfulLogin(result.userId, primaryRole, ipAddress, userAgent);
  }

  /**
   * Resets failed counters, updates `lastLoginAt`, creates session, and constructs auth response.
   */
  private static async finalizeSuccessfulLogin(
    userId: string,
    primaryRole: UserRole,
    ipAddress: string,
    userAgent: string
  ): Promise<AdminAuthResult> {
    const db = getDb();
    const now = new Date();

    // Reset lockout counters & update lastLoginAt
    await db
      .update(users)
      .set({
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: now,
        updatedAt: now,
      })
      .where(eq(users.id, userId));

    // Create session record
    const { rawToken, sessionId } = await AdminSessionService.createSession(userId, ipAddress, userAgent);

    // Record login event & audit
    await db.insert(loginEvents).values({
      userId,
      eventType: 'LOGIN_SUCCESS',
      result: 'SUCCESS',
      ipAddress,
      userAgent,
    });

    await db.insert(auditLogs).values({
      userId,
      action: 'LOGIN_SUCCESS',
      module: 'AUTH',
      entityType: 'USER',
      entityId: userId,
      result: 'SUCCESS',
      ipAddress,
      userAgent,
    });

    // Fetch full permissions and school assignments
    const [fullUser] = await db.select().from(users).where(eq(users.id, userId));
    const schoolRows = await db
      .select({ schoolId: userSchoolAccess.schoolId })
      .from(userSchoolAccess)
      .where(eq(userSchoolAccess.userId, userId));

    const allowedSchoolIds = schoolRows.map((r) => r.schoolId);
    const resolvedPermissions = await this.getResolvedPermissions(userId, primaryRole);

    return {
      requires2Fa: false,
      sessionToken: rawToken,
      sessionId,
      user: {
        id: fullUser.id,
        email: fullUser.email,
        firstName: fullUser.firstName,
        lastName: fullUser.lastName,
        role: primaryRole,
        permissions: resolvedPermissions,
        allowedSchoolIds,
        isTwoFactorEnabled: fullUser.isTwoFactorEnabled,
      },
    };
  }

  /**
   * Returns the complete resolved permissions for a user.
   */
  static async getResolvedPermissions(userId: string, role: UserRole): Promise<PermissionCode[]> {
    if (role === 'SUPER_ADMIN') {
      // Super admin has all permissions
      const db = getDb();
      const allPerms = await db.select({ code: permissions.code }).from(permissions);
      return allPerms.map((p) => p.code as PermissionCode);
    }

    const db = getDb();
    const rolePermRows = await db
      .select({ code: permissions.code })
      .from(userRoles)
      .innerJoin(rolePermissions, eq(userRoles.roleId, rolePermissions.roleId))
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(eq(userRoles.userId, userId));

    return rolePermRows.map((r) => r.code as PermissionCode);
  }

  /**
   * Initiates forgot password flow with enumeration safety.
   */
  static async requestPasswordReset(emailCandidate: string, ipAddress = '127.0.0.1'): Promise<{ message: string }> {
    const email = (emailCandidate || '').trim().toLowerCase();
    const db = getDb();
    const [user] = await db.select().from(users).where(eq(users.email, email));

    if (user && user.status === 'ACTIVE') {
      const resetToken = TokenSecurity.generatePrefixedToken('rst', 24);
      const now = new Date();
      const expiresAt = new Date(now.getTime() + PASSWORD_RESET_EXPIRY_MS);

      await db
        .update(users)
        .set({
          passwordResetToken: resetToken,
          passwordResetExpiresAt: expiresAt,
          updatedAt: now,
        })
        .where(eq(users.id, user.id));

      await db.insert(auditLogs).values({
        userId: user.id,
        action: 'PASSWORD_RESET_REQUEST',
        module: 'AUTH',
        entityType: 'USER',
        entityId: user.id,
        result: 'SUCCESS',
        ipAddress,
      });
    }

    // Always return safe generic message
    return {
      message: 'Si cette adresse correspond à un compte, un email de réinitialisation a été envoyé.',
    };
  }

  /**
   * Resets password using a validated single-use token.
   */
  static async resetPassword(token: string, newPassword: string, ipAddress = '127.0.0.1'): Promise<void> {
    if (!token || !newPassword) {
      throw new AppError('Jeton ou nouveau mot de passe manquant.', 'VALIDATION_ERROR', 400);
    }

    // Policy check
    const policyResult = PasswordSecurity.validatePolicy(newPassword);
    if (!policyResult.valid) {
      throw new AppError(policyResult.errors.join(' '), 'VALIDATION_ERROR', 400);
    }

    const db = getDb();
    const now = new Date();

    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.passwordResetToken, token), gt(users.passwordResetExpiresAt, now)));

    if (!user) {
      throw new AppError('Le lien de réinitialisation est invalide ou a expiré.', 'VALIDATION_ERROR', 400);
    }

    const newHash = await PasswordSecurity.hash(newPassword);

    await db
      .update(users)
      .set({
        passwordHash: newHash,
        passwordResetToken: null,
        passwordResetExpiresAt: null,
        failedLoginAttempts: 0,
        lockedUntil: null,
        updatedAt: now,
      })
      .where(eq(users.id, user.id));

    // Revoke all existing sessions upon password reset for security
    await AdminSessionService.revokeAllUserSessions(user.id);

    await db.insert(auditLogs).values({
      userId: user.id,
      action: 'PASSWORD_RESET_COMPLETE',
      module: 'AUTH',
      entityType: 'USER',
      entityId: user.id,
      result: 'SUCCESS',
      ipAddress,
    });
  }

  /**
   * Changes password for an authenticated user.
   */
  static async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    currentSessionId?: string
  ): Promise<void> {
    const policyResult = PasswordSecurity.validatePolicy(newPassword);
    if (!policyResult.valid) {
      throw new AppError(policyResult.errors.join(' '), 'VALIDATION_ERROR', 400);
    }

    const db = getDb();
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user || !user.passwordHash) {
      throw new AppError('Utilisateur introuvable.', 'NOT_FOUND', 404);
    }

    const isCurrentValid = await PasswordSecurity.verify(currentPassword, user.passwordHash);
    if (!isCurrentValid) {
      throw new AppError('Le mot de passe actuel est incorrect.', 'VALIDATION_ERROR', 400);
    }

    const newHash = await PasswordSecurity.hash(newPassword);
    const now = new Date();

    await db
      .update(users)
      .set({
        passwordHash: newHash,
        updatedAt: now,
      })
      .where(eq(users.id, userId));

    // Revoke other sessions (keep current session)
    if (currentSessionId) {
      await AdminSessionService.revokeAllUserSessions(userId, currentSessionId);
    }

    await db.insert(auditLogs).values({
      userId,
      action: 'PASSWORD_CHANGED',
      module: 'AUTH',
      entityType: 'USER',
      entityId: userId,
      result: 'SUCCESS',
    });
  }

  /**
   * Logs out a session.
   */
  static async logout(sessionId: string, userId?: string): Promise<void> {
    await AdminSessionService.revokeSession(sessionId);
    if (userId) {
      const db = getDb();
      await db.insert(loginEvents).values({
        userId,
        eventType: 'LOGOUT',
        result: 'SUCCESS',
      });
    }
  }
}
