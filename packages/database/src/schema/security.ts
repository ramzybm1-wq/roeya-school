/**
 * Schema: login_events, user_sessions, two_factor_challenges
 * Security, authentication event logging, session management, and short-lived 2FA challenges.
 */

import {
  pgTable, uuid, varchar, text, integer, boolean, timestamp, index,
} from 'drizzle-orm/pg-core';
import { loginEventTypeEnum, loginEventResultEnum } from './enums';
import { users } from './users';

export const loginEvents = pgTable(
  'login_events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'set null' }), // nullable
    emailAttempted: varchar('email_attempted', { length: 255 }), // stored carefully for security
    eventType: loginEventTypeEnum('event_type').notNull(),
    result: loginEventResultEnum('result').notNull(),
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: text('user_agent'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_le_user').on(table.userId),
    index('idx_le_created').on(table.createdAt),
    index('idx_le_type').on(table.eventType),
  ]
);

export const userSessions = pgTable(
  'user_sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: varchar('token_hash', { length: 255 }).notNull().unique(),
    sessionProviderId: varchar('session_provider_id', { length: 255 }),
    deviceInfo: text('device_info'),
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: text('user_agent'),
    isRevoked: boolean('is_revoked').notNull().default(false),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    lastActivityAt: timestamp('last_activity_at', { withTimezone: true }).notNull().defaultNow(),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_us_user').on(table.userId),
    index('idx_us_token_hash').on(table.tokenHash),
    index('idx_us_activity').on(table.lastActivityAt),
    index('idx_us_expires').on(table.expiresAt),
  ]
);

export const twoFactorChallenges = pgTable(
  'two_factor_challenges',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    challengeToken: varchar('challenge_token', { length: 255 }).notNull().unique(),
    attempts: integer('attempts').notNull().default(0),
    maxAttempts: integer('max_attempts').notNull().default(5),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: text('user_agent'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_2fa_token').on(table.challengeToken),
    index('idx_2fa_user').on(table.userId),
    index('idx_2fa_expires').on(table.expiresAt),
  ]
);
