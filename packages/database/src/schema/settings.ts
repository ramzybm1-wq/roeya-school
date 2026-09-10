/**
 * Schema: system_settings
 * Configurable key-value system settings scoped by school or global.
 * Not for structured business data — use dedicated tables for those.
 */

import {
  pgTable, uuid, varchar, jsonb, boolean, timestamp, uniqueIndex,
} from 'drizzle-orm/pg-core';
import { schools } from './schools';

export const systemSettings = pgTable(
  'system_settings',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    scope: varchar('scope', { length: 30 }).notNull().default('GLOBAL'),
    schoolId: uuid('school_id')
      .references(() => schools.id, { onDelete: 'cascade' }), // nullable for global settings
    key: varchar('key', { length: 200 }).notNull(),
    valueJson: jsonb('value_json'),
    isPublic: boolean('is_public').notNull().default(false),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('uq_setting_scope_school_key')
      .on(table.scope, table.schoolId, table.key),
  ]
);
