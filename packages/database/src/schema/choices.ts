/**
 * Schema: level_choices, education_transitions
 * Supports arbitrary depth hierarchy (level -> choice -> sub-choice -> ...)
 * and academic progression transitions between levels/choices.
 */

import {
  pgTable, uuid, varchar, integer, boolean, timestamp, text, index, AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { levels } from './cycles';

export const levelChoices = pgTable(
  'level_choices',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    levelId: uuid('level_id')
      .notNull()
      .references(() => levels.id, { onDelete: 'restrict' }),
    parentId: uuid('parent_id')
      .references((): AnyPgColumn => levelChoices.id, { onDelete: 'cascade' }),
    code: varchar('code', { length: 50 }).notNull().unique(),
    nameFr: varchar('name_fr', { length: 150 }).notNull(),
    nameAr: varchar('name_ar', { length: 150 }),
    description: text('description'),
    nodeType: varchar('node_type', { length: 30 }).notNull().default('CHOICE'),
    displayOrder: integer('display_order').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_lc_level').on(table.levelId),
    index('idx_lc_parent').on(table.parentId),
    index('idx_lc_code').on(table.code),
  ]
);

export const educationTransitions = pgTable(
  'education_transitions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    fromLevelId: uuid('from_level_id')
      .notNull()
      .references(() => levels.id, { onDelete: 'cascade' }),
    fromChoiceId: uuid('from_choice_id')
      .references(() => levelChoices.id, { onDelete: 'cascade' }),
    toLevelId: uuid('to_level_id')
      .notNull()
      .references(() => levels.id, { onDelete: 'cascade' }),
    toChoiceId: uuid('to_choice_id')
      .references(() => levelChoices.id, { onDelete: 'cascade' }),
    isActive: boolean('is_active').notNull().default(true),
    notes: text('notes'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_et_from').on(table.fromLevelId, table.fromChoiceId),
    index('idx_et_to').on(table.toLevelId, table.toChoiceId),
  ]
);

export type LevelChoice = typeof levelChoices.$inferSelect;
export type NewLevelChoice = typeof levelChoices.$inferInsert;
export type EducationTransition = typeof educationTransitions.$inferSelect;
export type NewEducationTransition = typeof educationTransitions.$inferInsert;
