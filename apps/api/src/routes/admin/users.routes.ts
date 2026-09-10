/**
 * Admin User Management Routes (/api/admin/users/*)
 */

import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, requirePermission } from '../../middleware/rbac.middleware';
import { AdminUserService } from '../../services/admin-user.service';
import { AdminAuthService } from '../../services/admin-auth.service';
import { getDb, users, userRoles, roles, userSchoolAccess, auditLogs } from '@vision-school/database';
import { eq, and, ilike, or } from 'drizzle-orm';
import { ApiResponse, AppError, UserRole } from '@vision-school/shared';

const router = Router();
router.use(requireAuth());

// GET /api/admin/users/summary - Staff account counters
router.get('/summary', requirePermission('users.read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();

    // Only count users that have a role (staff accounts, not parents)
    const staffRows = await db
      .select({ userId: userRoles.userId, status: users.status, roleCode: roles.code })
      .from(userRoles)
      .innerJoin(users, eq(userRoles.userId, users.id))
      .innerJoin(roles, eq(userRoles.roleId, roles.id));

    const total = staffRows.length;
    const active = staffRows.filter((r) => r.status === 'ACTIVE').length;
    const inactive = staffRows.filter((r) => r.status !== 'ACTIVE').length;
    const superAdmins = staffRows.filter((r) => r.roleCode === 'SUPER_ADMIN').length;
    const admins = staffRows.filter((r) => r.roleCode === 'ADMIN').length;
    const agents = staffRows.filter((r) => r.roleCode === 'AGENT').length;

    res.json(ApiResponse.success({ total, active, inactive, superAdmins, admins, agents }));
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/users - List STAFF users only (excludes parent/client accounts)
router.get('/', requirePermission('users.read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const search = req.query.search as string;
    const roleFilter = req.query.role as string;
    const statusFilter = req.query.status as string;

    // Join users with user_roles so we only get staff accounts (not parents)
    const staffJoinRows = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        phone: users.phone,
        status: users.status,
        isTwoFactorEnabled: users.isTwoFactorEnabled,
        lastLoginAt: users.lastLoginAt,
        createdAt: users.createdAt,
        roleCode: roles.code,
      })
      .from(users)
      .innerJoin(userRoles, eq(users.id, userRoles.userId))
      .innerJoin(roles, eq(userRoles.roleId, roles.id));

    const userList = await Promise.all(
      staffJoinRows.map(async (u) => {
        const schoolRows = await db
          .select({ schoolId: userSchoolAccess.schoolId })
          .from(userSchoolAccess)
          .where(eq(userSchoolAccess.userId, u.id));

        return {
          id: u.id,
          email: u.email,
          firstName: u.firstName,
          lastName: u.lastName,
          phone: u.phone,
          role: u.roleCode as UserRole,
          status: u.status,
          allowedSchoolIds: schoolRows.map((s) => s.schoolId),
          isTwoFactorEnabled: u.isTwoFactorEnabled,
          lastLoginAt: u.lastLoginAt,
          createdAt: u.createdAt,
        };
      })
    );

    // Apply actor school scoping if not Super Admin
    let filtered = userList;
    if (req.user!.role !== 'SUPER_ADMIN') {
      filtered = filtered.filter(
        (u) =>
          u.role !== 'SUPER_ADMIN' &&
          u.allowedSchoolIds.some((sId) => req.user!.allowedSchoolIds.includes(sId))
      );
    }

    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (u) =>
          u.firstName.toLowerCase().includes(q) ||
          u.lastName.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q)
      );
    }

    if (roleFilter) {
      filtered = filtered.filter((u) => u.role === roleFilter);
    }

    if (statusFilter) {
      filtered = filtered.filter((u) => u.status === statusFilter);
    }

    res.json(ApiResponse.success(filtered));
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/users - Invite user
router.post('/', requirePermission('users.manage'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await AdminUserService.inviteUser(req.user!, req.body);
    res.json(ApiResponse.success(result));
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/users/:id
router.get('/:id', requirePermission('users.read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const [user] = await db.select().from(users).where(eq(users.id, req.params.id));
    if (!user) throw AppError.notFound('Utilisateur introuvable.');

    const roleRows = await db
      .select({ code: roles.code })
      .from(userRoles)
      .innerJoin(roles, eq(userRoles.roleId, roles.id))
      .where(eq(userRoles.userId, user.id));

    const schoolRows = await db
      .select({ schoolId: userSchoolAccess.schoolId })
      .from(userSchoolAccess)
      .where(eq(userSchoolAccess.userId, user.id));

    res.json(
      ApiResponse.success({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        role: roleRows[0]?.code || 'AGENT',
        status: user.status,
        allowedSchoolIds: schoolRows.map((s) => s.schoolId),
        isTwoFactorEnabled: user.isTwoFactorEnabled,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
      })
    );
  } catch (error) {
    next(error);
  }
});

// PUT /api/admin/users/:id - Update user
router.put('/:id', requirePermission('users.manage'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await AdminUserService.updateUser(req.user!, req.params.id, req.body);
    res.json(ApiResponse.success({ message: 'Utilisateur mis à jour avec succès.' }));
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/users/:id/resend-invitation
router.post('/:id/resend-invitation', requirePermission('users.manage'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await AdminUserService.resendInvitation(req.user!, req.params.id);
    res.json(ApiResponse.success(result));
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/users/:id/reset-password-link
router.post('/:id/reset-password-link', requirePermission('users.manage'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const [user] = await db.select({ email: users.email }).from(users).where(eq(users.id, req.params.id));
    if (!user) throw AppError.notFound('Utilisateur introuvable.');

    await AdminAuthService.requestPasswordReset(user.email);
    res.json(ApiResponse.success({ message: 'Lien de réinitialisation envoyé avec succès.' }));
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/users/:id/suspend
router.post('/:id/suspend', requirePermission('users.manage'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { until, reason } = req.body;
    await AdminUserService.suspendUser(req.user!, req.params.id, until ? new Date(until) : undefined, reason);
    res.json(ApiResponse.success({ message: 'Utilisateur suspendu avec succès.' }));
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/users/:id/disable
router.post('/:id/disable', requirePermission('users.manage'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await AdminUserService.disableUser(req.user!, req.params.id);
    res.json(ApiResponse.success({ message: 'Utilisateur désactivé avec succès.' }));
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/users/:id/reactivate
router.post('/:id/reactivate', requirePermission('users.manage'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const [targetUser] = await db.select().from(users).where(eq(users.id, req.params.id));
    if (!targetUser) throw AppError.notFound('Utilisateur introuvable.');

    if (targetUser.status === 'ACTIVE') {
      res.json(ApiResponse.success({ message: 'Le compte est déjà actif.' }));
      return;
    }

    await db
      .update(users)
      .set({ status: 'ACTIVE', suspendedUntil: null, suspensionReason: null, disabledAt: null, updatedAt: new Date() })
      .where(eq(users.id, req.params.id));

    // Audit log
    await db.insert(auditLogs).values({
      userId: req.user!.id,
      action: 'USER_REACTIVATED',
      module: 'USERS',
      entityType: 'USER',
      entityId: targetUser.id,
      beforeJson: { status: targetUser.status },
      afterJson: { status: 'ACTIVE' },
      result: 'SUCCESS',
    });

    res.json(ApiResponse.success({ message: 'Compte réactivé avec succès.' }));
  } catch (error) {
    next(error);
  }
});

// DELETE /api/admin/users/:id - Permanent deletion of staff collaborator
router.delete('/:id', requirePermission('users.manage'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await AdminUserService.deleteUser(req.user!, req.params.id);
    res.json(ApiResponse.success({ message: 'Compte collaborateur supprimé avec succès.' }));
  } catch (error) {
    next(error);
  }
});

export default router;
