/**
 * Schema: academic_years
 * Academic year definitions with status lifecycle and active-default constraint.
 */

import { pgTable, uuid, varchar, date, boolean, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { academicYearStatusEnum } from './enums';

export const academicYears = pgTable(
  'academic_years',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 100 }).notNull(),
    startDate: date('start_date').notNull(),
    endDate: date('end_date').notNull(),
    status: academicYearStatusEnum('status').notNull().default('DRAFT'),
    isActiveDefault: boolean('is_active_default').notNull().default(false),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
  },
  (table) => [
    // Only one active-default academic year at a time (partial unique index)
    uniqueIndex('uq_single_active_default_year')
      .on(table.isActiveDefault)
      .where(sql`${table.isActiveDefault} = true AND ${table.archivedAt} IS NULL`),
  ]
);
