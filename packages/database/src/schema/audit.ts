/**
 * Schema: audit_logs
 * Append-only audit trail for all sensitive admin actions.
 * Never UPDATE or DELETE from normal application perspective.
 */

import {
  pgTable, uuid, varchar, text, jsonb, timestamp, index,
} from 'drizzle-orm/pg-core';
import { auditResultEnum } from './enums';
import { users } from './users';
import { schools } from './schools';

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'set null' }), // nullable for system actions
    action: varchar('action', { length: 100 }).notNull(),
    module: varchar('module', { length: 100 }),

    entityType: varchar('entity_type', { length: 50 }).notNull(),
    entityId: uuid('entity_id'),
    schoolId: uuid('school_id')
      .references(() => schools.id, { onDelete: 'set null' }),

    // JSON snapshots
    beforeJson: jsonb('before_json'),
    afterJson: jsonb('after_json'),
    metadataJson: jsonb('metadata_json'),

    // Request context
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: text('user_agent'),
    result: auditResultEnum('result').notNull().default('SUCCESS'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_audit_user').on(table.userId),
    index('idx_audit_entity').on(table.entityType, table.entityId),
    index('idx_audit_created').on(table.createdAt),
    index('idx_audit_school').on(table.schoolId),
    index('idx_audit_action').on(table.action),
  ]
);
