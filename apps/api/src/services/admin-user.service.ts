/**
 * Admin User Management & Staff Invitation Service for VISION SCHOOL.
 * Implements user lifecycle, invitations, role assignments, school scoping,
 * and Last Super Admin protection guarantees.
 */

import { getDb } from '@vision-school/database';
import {
  users,
  roles,
  userRoles,
  userSchoolAccess,
  auditLogs,
} from '@vision-school/database';
import { eq, and, gt, sql, inArray } from 'drizzle-orm';
import { PasswordSecurity, TokenSecurity, AuthGuard, AuthorizationService } from '@vision-school/auth';
import { AppError, User, UserRole, UserStatus } from '@vision-school/shared';
import { AdminSessionService } from './admin-session.service';

const INVITATION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface InviteUserPayload {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: UserRole;
  allowedSchoolIds: string[];
}

export interface UpdateUserPayload {
  firstName?: string;
  lastName?: string;
  phone?: string;
  role?: UserRole;
  allowedSchoolIds?: string[];
  status?: UserStatus;
}

export class AdminUserService {
  /**
   * Counts currently active SUPER_ADMIN users across the system.
   */
  static async countActiveSuperAdmins(): Promise<number> {
    const db = getDb();
    const result = await db
      .select({ count: sql<number>`count(distinct ${users.id})` })
      .from(users)
      .innerJoin(userRoles, eq(users.id, userRoles.userId))
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(and(eq(roles.code, 'SUPER_ADMIN'), eq(users.status, 'ACTIVE')));

    return Number(result[0]?.count || 0);
  }

  /**
   * Invites a new staff member to the platform.
   */
  static async inviteUser(
    actor: User,
    payload: InviteUserPayload
  ): Promise<{ user: { id: string; email: string; role: UserRole }; invitationToken: string }> {
    // 1. Permission check
    if (!AuthGuard.hasPermission(actor, 'users.manage')) {
      throw AppError.forbidden('Vous n’avez pas la permission d’inviter des utilisateurs.');
    }

    // 2. Role assignment hierarchy check
    if (!AuthGuard.canAssignRole(actor, payload.role)) {
      throw AppError.forbidden(`Vous n’êtes pas autorisé à attribuer le rôle ${payload.role}.`);
    }

    const allowedSchoolIds = Array.isArray(payload.allowedSchoolIds) ? payload.allowedSchoolIds : [];

    // 3. School scope check
    if (actor.role !== 'SUPER_ADMIN' && allowedSchoolIds.length > 0) {
      const hasUnauthorizedSchool = allowedSchoolIds.some(
        (id) => !actor.allowedSchoolIds.includes(id)
      );
      if (hasUnauthorizedSchool) {
        throw AppError.forbidden('Vous ne pouvez pas assigner des établissements hors de votre périmètre.');
      }
    }

    const email = payload.email.trim().toLowerCase();
    const db = getDb();

    // 4. Unique email check
    const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
    if (existing) {
      throw AppError.badRequest('Un compte utilisateur avec cette adresse email existe déjà.');
    }

    // 5. Generate secure invitation token (7-day validity)
    const invitationToken = TokenSecurity.generatePrefixedToken('inv', 24);
    const now = new Date();
    const invitationExpiresAt = new Date(now.getTime() + INVITATION_EXPIRY_MS);

    const [newUser] = await db
      .insert(users)
      .values({
        email,
        firstName: payload.firstName.trim(),
        lastName: payload.lastName.trim(),
        phone: payload.phone || null,
        status: 'INVITED',
        invitationToken,
        invitationExpiresAt,
        invitedByUserId: actor.id,
        invitedAt: now,
      })
      .returning();

    // 6. Assign Role
    const [targetRole] = await db.select().from(roles).where(eq(roles.code, payload.role));
    if (targetRole) {
      await db.insert(userRoles).values({
        userId: newUser.id,
        roleId: targetRole.id,
      });
    }

    // 7. Assign School Access
    for (const schoolId of allowedSchoolIds) {
      await db.insert(userSchoolAccess).values({
        userId: newUser.id,
        schoolId,
      });
    }

    // 8. Record audit log
    await db.insert(auditLogs).values({
      userId: actor.id,
      action: 'USER_INVITED',
      module: 'USERS',
      entityType: 'USER',
      entityId: newUser.id,
      afterJson: { email, role: payload.role, schoolIds: allowedSchoolIds },
      result: 'SUCCESS',
    });

    return {
      user: {
        id: newUser.id,
        email: newUser.email,
        role: payload.role,
      },
      invitationToken,
    };
  }

  /**
   * Validates an invitation token for public invitation landing page.
   */
  static async validateInvitation(token: string): Promise<{
    valid: boolean;
    user?: { firstName: string; lastName: string; email: string; role: UserRole };
    error?: string;
  }> {
    if (!token) {
      return { valid: false, error: 'Jeton d’invitation manquant.' };
    }

    const db = getDb();
    const now = new Date();

    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.invitationToken, token), gt(users.invitationExpiresAt, now)));

    if (!user || user.status !== 'INVITED') {
      return { valid: false, error: 'Cette invitation a expiré ou a déjà été utilisée.' };
    }

    const userRoleRows = await db
      .select({ code: roles.code })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(eq(userRoles.userId, user.id));

    const role = (userRoleRows[0]?.code as UserRole) || 'AGENT';

    return {
      valid: true,
      user: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role,
      },
    };
  }

  /**
   * Accepts invitation, sets password, and activates account (`INVITED -> ACTIVE`).
   */
  static async acceptInvitation(token: string, passwordCandidate: string): Promise<{ activated: boolean; email: string }> {
    const validation = await this.validateInvitation(token);
    if (!validation.valid || !validation.user) {
      throw AppError.badRequest(validation.error || 'Invitation invalide.');
    }

    const policyResult = PasswordSecurity.validatePolicy(passwordCandidate);
    if (!policyResult.valid) {
      throw AppError.badRequest(policyResult.errors.join(' '));
    }

    const passwordHash = await PasswordSecurity.hash(passwordCandidate);
    const db = getDb();
    const now = new Date();

    const [user] = await db.select().from(users).where(eq(users.invitationToken, token));
    if (!user) {
      throw AppError.notFound('Utilisateur introuvable.');
    }

    await db
      .update(users)
      .set({
        passwordHash,
        status: 'ACTIVE',
        invitationToken: null,
        invitationExpiresAt: null,
        acceptedInvitationAt: now,
        updatedAt: now,
      })
      .where(eq(users.id, user.id));

    await db.insert(auditLogs).values({
      userId: user.id,
      action: 'USER_ACTIVATED',
      module: 'AUTH',
      entityType: 'USER',
      entityId: user.id,
      result: 'SUCCESS',
    });

    return { activated: true, email: user.email };
  }

  /**
   * Resends an invitation with a fresh 7-day token.
   */
  static async resendInvitation(actor: User, userId: string): Promise<{ invitationToken: string }> {
    if (!AuthGuard.hasPermission(actor, 'users.manage')) {
      throw AppError.forbidden('Permission refusée.');
    }

    const db = getDb();
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) {
      throw AppError.notFound('Utilisateur introuvable.');
    }

    if (user.status !== 'INVITED') {
      throw AppError.badRequest('Ce compte est déjà activé.');
    }

    const invitationToken = TokenSecurity.generatePrefixedToken('inv', 24);
    const now = new Date();
    const invitationExpiresAt = new Date(now.getTime() + INVITATION_EXPIRY_MS);

    await db
      .update(users)
      .set({
        invitationToken,
        invitationExpiresAt,
        updatedAt: now,
      })
      .where(eq(users.id, userId));

    return { invitationToken };
  }

  /**
   * Updates user details, role assignments, school access, and status.
   * Strictly enforces Last Super Admin protection.
   */
  static async updateUser(actor: User, userId: string, payload: UpdateUserPayload): Promise<void> {
    if (!AuthGuard.hasPermission(actor, 'users.manage')) {
      throw AppError.forbidden('Permission refusée.');
    }

    const db = getDb();
    const [targetUser] = await db.select().from(users).where(eq(users.id, userId));
    if (!targetUser) {
      throw AppError.notFound('Utilisateur introuvable.');
    }

    // Fetch target user's current role
    const currentRoleRows = await db
      .select({ code: roles.code, id: roles.id })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(eq(userRoles.userId, userId));

    const currentRole = (currentRoleRows[0]?.code as UserRole) || 'AGENT';

    // Last Super Admin Protection Check
    if (currentRole === 'SUPER_ADMIN') {
      const isDemoting = payload.role && payload.role !== 'SUPER_ADMIN';
      const isDeactivating = payload.status && payload.status !== 'ACTIVE';

      if (isDemoting || isDeactivating) {
        const superAdminCount = await this.countActiveSuperAdmins();
        const check = AuthorizationService.validateLastSuperAdminProtection(
          superAdminCount,
          currentRole,
          isDemoting ? 'DEMOTE' : 'DISABLE'
        );
        if (!check.allowed) {
          throw AppError.badRequest(check.error!);
        }
      }
    }

    const now = new Date();

    // 1. Update basic fields & status
    await db
      .update(users)
      .set({
        firstName: payload.firstName !== undefined ? payload.firstName.trim() : targetUser.firstName,
        lastName: payload.lastName !== undefined ? payload.lastName.trim() : targetUser.lastName,
        phone: payload.phone !== undefined ? payload.phone : targetUser.phone,
        status: payload.status !== undefined ? (payload.status as any) : targetUser.status,
        updatedAt: now,
      })
      .where(eq(users.id, userId));

    // 2. Update role if specified
    if (payload.role && payload.role !== currentRole) {
      if (!AuthGuard.canAssignRole(actor, payload.role)) {
        throw AppError.forbidden(`Vous n’êtes pas autorisé à attribuer le rôle ${payload.role}.`);
      }

      await db.delete(userRoles).where(eq(userRoles.userId, userId));
      const [newRole] = await db.select().from(roles).where(eq(roles.code, payload.role));
      if (newRole) {
        await db.insert(userRoles).values({
          userId,
          roleId: newRole.id,
        });
      }
    }

    // 3. Update school access if specified
    if (payload.allowedSchoolIds) {
      await db.delete(userSchoolAccess).where(eq(userSchoolAccess.userId, userId));
      for (const sId of payload.allowedSchoolIds) {
        await db.insert(userSchoolAccess).values({
          userId,
          schoolId: sId,
        });
      }
    }

    // 4. If status changed to non-active, immediately revoke all user sessions
    if (payload.status && payload.status !== 'ACTIVE') {
      await AdminSessionService.revokeAllUserSessions(userId);
    }

    // 5. Record audit log
    await db.insert(auditLogs).values({
      userId: actor.id,
      action: payload.role && payload.role !== currentRole ? 'USER_ROLE_CHANGED' : 'USER_UPDATED',
      module: 'USERS',
      entityType: 'USER',
      entityId: userId,
      beforeJson: { role: currentRole, status: targetUser.status },
      afterJson: payload,
      result: 'SUCCESS',
    });
  }

  /**
   * Suspends a user temporarily with optional duration and reason.
   */
  static async suspendUser(actor: User, userId: string, until?: Date, reason?: string): Promise<void> {
    const db = getDb();
    const [targetUser] = await db.select().from(users).where(eq(users.id, userId));
    if (!targetUser) throw AppError.notFound('Utilisateur introuvable.');

    const currentRoleRows = await db
      .select({ code: roles.code })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(eq(userRoles.userId, userId));
    const currentRole = (currentRoleRows[0]?.code as UserRole) || 'AGENT';

    if (currentRole === 'SUPER_ADMIN') {
      const superAdminCount = await this.countActiveSuperAdmins();
      const check = AuthorizationService.validateLastSuperAdminProtection(superAdminCount, currentRole, 'SUSPEND');
      if (!check.allowed) throw AppError.badRequest(check.error!);
    }

    await db
      .update(users)
      .set({
        status: 'SUSPENDED',
        suspendedUntil: until || null,
        suspensionReason: reason || null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    await AdminSessionService.revokeAllUserSessions(userId);

    await db.insert(auditLogs).values({
      userId: actor.id,
      action: 'USER_SUSPENDED',
      module: 'USERS',
      entityType: 'USER',
      entityId: userId,
      afterJson: { suspendedUntil: until, reason },
      result: 'SUCCESS',
    });
  }

  /**
   * Disables a user account permanently.
   */
  static async disableUser(actor: User, userId: string): Promise<void> {
    const db = getDb();
    const [targetUser] = await db.select().from(users).where(eq(users.id, userId));
    if (!targetUser) throw AppError.notFound('Utilisateur introuvable.');

    const currentRoleRows = await db
      .select({ code: roles.code })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(eq(userRoles.userId, userId));
    const currentRole = (currentRoleRows[0]?.code as UserRole) || 'AGENT';

    if (currentRole === 'SUPER_ADMIN') {
      const superAdminCount = await this.countActiveSuperAdmins();
      const check = AuthorizationService.validateLastSuperAdminProtection(superAdminCount, currentRole, 'DISABLE');
      if (!check.allowed) throw AppError.badRequest(check.error!);
    }

    await db
      .update(users)
      .set({
        status: 'DISABLED',
        disabledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    await AdminSessionService.revokeAllUserSessions(userId);

    await db.insert(auditLogs).values({
      userId: actor.id,
      action: 'USER_DISABLED',
      module: 'USERS',
      entityType: 'USER',
      entityId: userId,
      afterJson: { status: 'DISABLED' },
      result: 'SUCCESS',
    });
  }

  /**
   * Permanently deletes a staff collaborator account:
   * - Enforces Last Super Admin protection (blocks with "Impossible de supprimer le dernier Super Administrateur actif.")
   * - Blocks self-deletion (actor cannot delete their own active account)
   * - Restricts deletion permissions (only SUPER_ADMIN can delete other ADMIN/SUPER_ADMIN)
   * - Revokes all active sessions immediately
   * - Records USER_DELETED audit log with actor ID, target user ID, target role, timestamp
   * - Preserves historical registrations/notes/audit records (foreign keys set null / cascade safely)
   */
  static async deleteUser(actor: User, userId: string): Promise<void> {
    if (!AuthGuard.hasPermission(actor, 'users.manage') && !AuthGuard.hasPermission(actor, 'users.delete')) {
      throw AppError.forbidden('Vous n’avez pas la permission de supprimer des collaborateurs.');
    }

    if (actor.id === userId) {
      throw AppError.forbidden('Action impossible : vous ne pouvez pas supprimer votre propre compte actif.');
    }

    const db = getDb();
    const [targetUser] = await db.select().from(users).where(eq(users.id, userId));
    if (!targetUser) {
      throw AppError.notFound('Utilisateur introuvable.');
    }

    const currentRoleRows = await db
      .select({ code: roles.code })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(eq(userRoles.userId, userId));
    const currentRole = (currentRoleRows[0]?.code as UserRole) || 'AGENT';

    // Last Super Admin Protection Check
    if (currentRole === 'SUPER_ADMIN' && targetUser.status === 'ACTIVE') {
      const superAdminCount = await this.countActiveSuperAdmins();
      const check = AuthorizationService.validateLastSuperAdminProtection(superAdminCount, currentRole, 'DELETE');
      if (!check.allowed) {
        throw AppError.badRequest('Impossible de supprimer le dernier Super Administrateur actif.');
      }
    }

    // Role hierarchy check: only SUPER_ADMIN can delete another SUPER_ADMIN or ADMIN
    if (actor.role !== 'SUPER_ADMIN' && (currentRole === 'SUPER_ADMIN' || currentRole === 'ADMIN')) {
      throw AppError.forbidden('Seul un Super Administrateur peut supprimer un compte collaborateur de ce niveau.');
    }

    // Revoke all active sessions
    await AdminSessionService.revokeAllUserSessions(userId);

    // Record audit event before deleting user record
    await db.insert(auditLogs).values({
      userId: actor.id,
      action: 'USER_DELETED',
      module: 'USERS',
      entityType: 'USER',
      entityId: userId,
      beforeJson: {
        actorId: actor.id,
        targetUserId: targetUser.id,
        targetEmail: targetUser.email,
        targetFirstName: targetUser.firstName,
        targetLastName: targetUser.lastName,
        targetRole: currentRole,
        timestamp: new Date().toISOString(),
      },
      result: 'SUCCESS',
    });

    // Clean up user_roles and user_school_access explicitly
    await db.delete(userRoles).where(eq(userRoles.userId, userId));
    await db.delete(userSchoolAccess).where(eq(userSchoolAccess.userId, userId));

    // Delete user record from database
    await db.delete(users).where(eq(users.id, userId));
  }
}
