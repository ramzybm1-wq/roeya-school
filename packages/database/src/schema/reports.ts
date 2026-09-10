/**
 * Schema: saved_reports, report_exports
 * Admin reporting configurations, export history, and temporary private export storage.
 */

import {
  pgTable, uuid, varchar, text, integer, boolean, timestamp, jsonb, index,
} from 'drizzle-orm/pg-core';
import { users } from './users';
import { schools } from './schools';

export const savedReports = pgTable(
  'saved_reports',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    schoolId: uuid('school_id')
      .references(() => schools.id, { onDelete: 'set null' }), // nullable for global reports
    name: varchar('name', { length: 255 }).notNull(),
    reportType: varchar('report_type', { length: 100 }).notNull(),
    filtersJson: jsonb('filters_json'),
    columnsJson: jsonb('columns_json'),
    sortJson: jsonb('sort_json'),
    isShared: boolean('is_shared').notNull().default(false),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_sr_user').on(table.userId),
    index('idx_sr_type').on(table.reportType),
  ]
);

export const reportExports = pgTable(
  'report_exports',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    reportType: varchar('report_type', { length: 100 }).notNull(),
    schoolScopeJson: jsonb('school_scope_json'),
    filtersJson: jsonb('filters_json'),
    format: varchar('format', { length: 20 }).notNull(), // 'XLSX', 'CSV', 'PDF'
    recordCount: integer('record_count').notNull().default(0),
    storageKey: text('storage_key'),
    status: varchar('status', { length: 50 }).notNull().default('READY'), // 'GENERATING', 'READY', 'FAILED', 'EXPIRED'

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_re_user').on(table.userId),
    index('idx_re_created').on(table.createdAt),
  ]
);
