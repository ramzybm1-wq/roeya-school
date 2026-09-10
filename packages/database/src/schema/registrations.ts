/**
 * Schema: registrations, registration_status_history, registration_notes
 * Core registration dossier with full status audit trail and private admin notes.
 */

import {
  pgTable, uuid, varchar, integer, boolean, timestamp, text, index, check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { registrationStatusEnum, registrationSourceEnum } from './enums';
import { schools } from './schools';
import { academicYears } from './academic-years';
import { levels } from './cycles';
import { levelChoices } from './choices';
import { schoolYearLevels } from './school-year-levels';
import { parents } from './parents';
import { students } from './students';
import { tariffs } from './tariffs';
import { formDefinitions } from './forms';
import { users } from './users';

export const registrations = pgTable(
  'registrations',
  {
    id: uuid('id').defaultRandom().primaryKey(),

    // Public-facing dossier code: REG-2026-000125 (generated via sequence)
    registrationCode: varchar('registration_code', { length: 30 }).notNull().unique(),

    // Relations (school_year_level_id is the canonical source; school/year/level duplicated for query perf)
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
      .references(() => levelChoices.id, { onDelete: 'restrict' }),
    schoolYearLevelId: uuid('school_year_level_id')
      .notNull()
      .references(() => schoolYearLevels.id, { onDelete: 'restrict' }),
    parentId: uuid('parent_id')
      .notNull()
      .references(() => parents.id, { onDelete: 'restrict' }),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id, { onDelete: 'restrict' }),
    clientUserId: uuid('client_user_id')
      .references(() => users.id, { onDelete: 'set null' }),

    // Status
    status: registrationStatusEnum('status').notNull().default('NEW'),

    // Key timestamps
    submittedAt: timestamp('submitted_at', { withTimezone: true }),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    refusedAt: timestamp('refused_at', { withTimezone: true }),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    waitlistedAt: timestamp('waitlisted_at', { withTimezone: true }),

    // Assignment
    assignedUserId: uuid('assigned_user_id'),

    // Tariff snapshot (frozen at acceptance time)
    tariffId: uuid('tariff_id')
      .references(() => tariffs.id, { onDelete: 'set null' }),
    tariffAmountSnapshot: integer('tariff_amount_snapshot'),
    tariffCurrencySnapshot: varchar('tariff_currency_snapshot', { length: 10 }),
    clientTariffVisibleSnapshot: boolean('client_tariff_visible_snapshot'),

    // Form builder version snapshot (for historical accuracy)
    formDefinitionId: uuid('form_definition_id')
      .references(() => formDefinitions.id, { onDelete: 'set null' }),
    formVersion: integer('form_version'),

    // Source & tracking
    source: registrationSourceEnum('source').notNull().default('PUBLIC_WEB'),
    publicTrackingEnabled: boolean('public_tracking_enabled').notNull().default(true),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_reg_code').on(table.registrationCode),
    index('idx_reg_status').on(table.status),
    index('idx_reg_school').on(table.schoolId),
    index('idx_reg_year').on(table.academicYearId),
    index('idx_reg_level').on(table.levelId),
    index('idx_reg_choice').on(table.choiceId),
    index('idx_reg_syl').on(table.schoolYearLevelId),
    index('idx_reg_submitted').on(table.submittedAt),
    index('idx_reg_parent').on(table.parentId),
    index('idx_reg_student').on(table.studentId),
    index('idx_reg_client_user').on(table.clientUserId),
    index('idx_reg_form_def').on(table.formDefinitionId),
  ]
);

/**
 * Full status change history — append-only, never overwritten.
 */
export const registrationStatusHistory = pgTable(
  'registration_status_history',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    registrationId: uuid('registration_id')
      .notNull()
      .references(() => registrations.id, { onDelete: 'cascade' }),
    fromStatus: registrationStatusEnum('from_status'),
    toStatus: registrationStatusEnum('to_status').notNull(),
    changedByUserId: uuid('changed_by_user_id'), // nullable for system/client actions
    reasonCode: varchar('reason_code', { length: 100 }),
    internalComment: text('internal_comment'),
    publicComment: text('public_comment'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_rsh_registration').on(table.registrationId),
    index('idx_rsh_created').on(table.createdAt),
  ]
);

/**
 * Admin-private notes on registration dossiers. Soft-deletable.
 */
export const registrationNotes = pgTable(
  'registration_notes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    registrationId: uuid('registration_id')
      .notNull()
      .references(() => registrations.id, { onDelete: 'cascade' }),
    userId: uuid('user_id'),
    content: text('content').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_rn_registration').on(table.registrationId),
  ]
);
