/**
 * Schema: cycles, levels
 * Educational cycle and grade level reference data.
 * Levels are global definitions — availability per school/year handled by school_year_levels.
 */

import { pgTable, uuid, varchar, integer, boolean, timestamp } from 'drizzle-orm/pg-core';

export const cycles = pgTable('cycles', {
  id: uuid('id').defaultRandom().primaryKey(),
  code: varchar('code', { length: 50 }).notNull().unique(),
  nameFr: varchar('name_fr', { length: 150 }).notNull(),
  nameAr: varchar('name_ar', { length: 150 }),
  displayOrder: integer('display_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
});

export const levels = pgTable('levels', {
  id: uuid('id').defaultRandom().primaryKey(),
  cycleId: uuid('cycle_id')
    .notNull()
    .references(() => cycles.id, { onDelete: 'restrict' }),
  code: varchar('code', { length: 50 }).notNull().unique(),
  nameFr: varchar('name_fr', { length: 150 }).notNull(),
  nameAr: varchar('name_ar', { length: 150 }),
  displayOrder: integer('display_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
});
