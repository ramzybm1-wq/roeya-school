/**
 * Schema: school_year_levels
 * CRITICAL junction table: one level offered in one school during one academic year.
 * Controls capacity, registration status, waiting list, and client visibility per combination.
 */

import {
  pgTable, uuid, boolean, integer, timestamp, uniqueIndex, index, check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { schools } from './schools';
import { academicYears } from './academic-years';
import { levels } from './cycles';
import { levelChoices } from './choices';
import { capacityModeEnum, fullBehaviorEnum, registrationStatusEnum } from './enums';

export const schoolYearLevels = pgTable(
  'school_year_levels',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    schoolId: uuid('school_id')
      .notNull()
      .references(() => schools.id, { onDelete: 'restrict' }),
    academicYearId: uuid('academic_year_id')
      .notNull()
      .references(() => academicYears.id, { onDelete: 'restrict' }),
    levelId: uuid('level_id')
      .notNull()
      .references(() => levels.id, { onDelete: 'restrict' }),
    choiceId: uuid('choice_id')
      .references(() => levelChoices.id, { onDelete: 'cascade' }),

    // Client visibility
    isVisibleClient: boolean('is_visible_client').notNull().default(true),

    // Registration control
    registrationStatus: registrationStatusEnum('registration_status').notNull().default('NEW'),
    registrationOpen: boolean('registration_open').notNull().default(false),
    registrationOpenAt: timestamp('registration_open_at', { withTimezone: true }),
    registrationCloseAt: timestamp('registration_close_at', { withTimezone: true }),

    // Capacity
    capacityMode: capacityModeEnum('capacity_mode').notNull().default('LIMITED'),
    capacityMax: integer('capacity_max'),
    fullBehavior: fullBehaviorEnum('full_behavior').notNull().default('WAITLIST'),

    // Waiting list
    waitingListEnabled: boolean('waiting_list_enabled').notNull().default(true),
    waitingListMax: integer('waiting_list_max'),

    // Display settings
    showRemainingPlaces: boolean('show_remaining_places').notNull().default(false),
    showStatusClient: boolean('show_status_client').notNull().default(true),
    showFillRate: boolean('show_fill_rate').notNull().default(false),
    nearFullThreshold: integer('near_full_threshold').default(85),
    displayOrder: integer('display_order').notNull().default(0),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
  },
  (table) => [
    // Only one config per school+year+level
    uniqueIndex('uq_school_year_level')
      .on(table.schoolId, table.academicYearId, table.levelId),

    // Query indexes
    index('idx_syl_school').on(table.schoolId),
    index('idx_syl_year').on(table.academicYearId),
    index('idx_syl_level').on(table.levelId),

    // Check constraints
    check('capacity_max_positive', sql`${table.capacityMax} IS NULL OR ${table.capacityMax} >= 0`),
    check('waiting_list_max_positive', sql`${table.waitingListMax} IS NULL OR ${table.waitingListMax} >= 0`),
    check('near_full_threshold_range', sql`${table.nearFullThreshold} IS NULL OR (${table.nearFullThreshold} BETWEEN 0 AND 100)`),
  ]
);
