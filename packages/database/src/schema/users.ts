/**
 * Schema: users, roles, permissions, role_permissions, user_roles, user_school_access, user_level_access
 * Full RBAC system with school-scoped access control, credentials, 2FA, invitations, and lockout state.
 */

import {
  pgTable, uuid, varchar, timestamp, boolean, text, integer, jsonb, index, primaryKey,
} from 'drizzle-orm/pg-core';
import { userStatusEnum } from './enums';
import { schools } from './schools';
import { levels } from './cycles';
import { mediaAssets } from './media';

export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    authProviderId: varchar('auth_provider_id', { length: 255 }),
    firstName: varchar('first_name', { length: 150 }).notNull(),
    lastName: varchar('last_name', { length: 150 }).notNull(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    phone: varchar('phone', { length: 30 }),
    avatarMediaId: uuid('avatar_media_id')
      .references(() => mediaAssets.id, { onDelete: 'set null' }),
    status: userStatusEnum('status').notNull().default('INVITED'),

    // Authentication credentials
    passwordHash: varchar('password_hash', { length: 255 }),

    // Two-Factor Authentication (2FA)
    twoFactorSecret: varchar('two_factor_secret', { length: 255 }),
    isTwoFactorEnabled: boolean('is_two_factor_enabled').notNull().default(false),
    twoFactorRecoveryCodes: jsonb('two_factor_recovery_codes'), // array of hashed recovery codes
    twoFactorConfiguredAt: timestamp('two_factor_configured_at', { withTimezone: true }),

    // Lockout & Brute-Force Protection
    failedLoginAttempts: integer('failed_login_attempts').notNull().default(0),
    lockedUntil: timestamp('locked_until', { withTimezone: true }),
    lastFailedLoginAt: timestamp('last_failed_login_at', { withTimezone: true }),

    // Staff Invitation Flow
    invitationToken: varchar('invitation_token', { length: 255 }),
    invitationExpiresAt: timestamp('invitation_expires_at', { withTimezone: true }),
    invitedByUserId: uuid('invited_by_user_id'),
    invitedAt: timestamp('invited_at', { withTimezone: true }),
    acceptedInvitationAt: timestamp('accepted_invitation_at', { withTimezone: true }),

    // Password Reset Flow
    passwordResetToken: varchar('password_reset_token', { length: 255 }),
    passwordResetExpiresAt: timestamp('password_reset_expires_at', { withTimezone: true }),

    // Account Suspension
    suspendedUntil: timestamp('suspended_until', { withTimezone: true }),
    suspensionReason: text('suspension_reason'),

    // Timestamps & Lifecycle
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    disabledAt: timestamp('disabled_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_users_email').on(table.email),
    index('idx_users_status').on(table.status),
    index('idx_users_invitation_token').on(table.invitationToken),
    index('idx_users_password_reset_token').on(table.passwordResetToken),
  ]
);

export const roles = pgTable('roles', {
  id: uuid('id').defaultRandom().primaryKey(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  isSystemRole: boolean('is_system_role').notNull().default(false),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const permissions = pgTable('permissions', {
  id: uuid('id').defaultRandom().primaryKey(),
  code: varchar('code', { length: 100 }).notNull().unique(),
  description: text('description'),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const rolePermissions = pgTable(
  'role_permissions',
  {
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    permissionId: uuid('permission_id')
      .notNull()
      .references(() => permissions.id, { onDelete: 'cascade' }),
  },
  (table) => [
    primaryKey({ columns: [table.roleId, table.permissionId] }),
  ]
);

export const userRoles = pgTable(
  'user_roles',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.roleId] }),
  ]
);

export const userSchoolAccess = pgTable(
  'user_school_access',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    schoolId: uuid('school_id')
      .notNull()
      .references(() => schools.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.schoolId] }),
  ]
);

export const userLevelAccess = pgTable(
  'user_level_access',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    levelId: uuid('level_id')
      .notNull()
      .references(() => levels.id, { onDelete: 'cascade' }),
    schoolId: uuid('school_id')
      .references(() => schools.id, { onDelete: 'cascade' }), // nullable
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.levelId] }),
  ]
);
