/**
 * Schema: document_types, school_level_document_requirements, registration_documents
 * Document configuration, per-school requirements, and versioned upload records.
 * Private documents never expose permanent public URLs — only storage keys.
 */

import {
  pgTable, uuid, varchar, integer, boolean, timestamp, text, index, check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { documentStatusEnum, fileRuleTypeEnum, uploadedByTypeEnum } from './enums';
import { schools } from './schools';
import { academicYears } from './academic-years';
import { levels, cycles } from './cycles';
import { levelChoices } from './choices';
import { registrations } from './registrations';

export const documentTypes = pgTable('document_types', {
  id: uuid('id').defaultRandom().primaryKey(),
  nameFr: varchar('name_fr', { length: 255 }).notNull(),
  nameAr: varchar('name_ar', { length: 255 }),
  descriptionFr: text('description_fr'),
  descriptionAr: text('description_ar'),
  fileRuleType: fileRuleTypeEnum('file_rule_type').notNull().default('IMAGE_OR_PDF'),
  maxFileSizeBytes: integer('max_file_size_bytes').default(5242880), // 5 MB
  maxFiles: integer('max_files').default(1),
  isActive: boolean('is_active').notNull().default(true),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const schoolLevelDocumentRequirements = pgTable(
  'school_level_document_requirements',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    schoolId: uuid('school_id')
      .references(() => schools.id, { onDelete: 'restrict' }), // nullable if applies to all schools
    academicYearId: uuid('academic_year_id')
      .references(() => academicYears.id, { onDelete: 'restrict' }), // nullable if applies to all years
    levelId: uuid('level_id')
      .references(() => levels.id, { onDelete: 'restrict' }), // nullable if applies to whole cycle/school
    cycleId: uuid('cycle_id')
      .references(() => cycles.id, { onDelete: 'restrict' }), // nullable if applies to cycle
    choiceId: uuid('choice_id')
      .references(() => levelChoices.id, { onDelete: 'set null' }), // nullable if applies to whole level
    documentTypeId: uuid('document_type_id')
      .notNull()
      .references(() => documentTypes.id, { onDelete: 'restrict' }),

    isRequired: boolean('is_required').notNull().default(false),
    blockSubmissionIfMissing: boolean('block_submission_if_missing').notNull().default(false),
    showClient: boolean('show_client').notNull().default(true),
    isActive: boolean('is_active').notNull().default(true),
    status: varchar('status', { length: 20 }).default('PUBLISHED'),
    displayOrder: integer('display_order').notNull().default(0),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_sldr_school_year').on(table.schoolId, table.academicYearId),
    index('idx_sldr_doctype').on(table.documentTypeId),
  ]
);

export const registrationDocuments = pgTable(
  'registration_documents',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    registrationId: uuid('registration_id')
      .notNull()
      .references(() => registrations.id, { onDelete: 'cascade' }),
    documentTypeId: uuid('document_type_id')
      .notNull()
      .references(() => documentTypes.id, { onDelete: 'restrict' }),

    // Private storage — NEVER a public URL
    storageKey: varchar('storage_key', { length: 500 }).notNull(),
    originalFilename: varchar('original_filename', { length: 500 }).notNull(),
    mimeType: varchar('mime_type', { length: 100 }).notNull(),
    fileSizeBytes: integer('file_size_bytes').notNull(),

    // Review status
    status: documentStatusEnum('status').notNull().default('UPLOADED'),
    versionNumber: integer('version_number').notNull().default(1),

    // Upload provenance
    uploadedAt: timestamp('uploaded_at', { withTimezone: true }).notNull().defaultNow(),
    uploadedByType: uploadedByTypeEnum('uploaded_by_type').notNull().default('PARENT'),
    uploadedByUserId: uuid('uploaded_by_user_id'), // nullable

    // Versioning — link to replaced document
    replacesDocumentId: uuid('replaces_document_id'), // self-reference — set after table creation via relation

    // Review
    reviewedByUserId: uuid('reviewed_by_user_id'),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    rejectionReasonCode: varchar('rejection_reason_code', { length: 100 }),
    publicReplacementMessage: text('public_replacement_message'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_rd_registration').on(table.registrationId),
    index('idx_rd_doctype').on(table.documentTypeId),
    index('idx_rd_status').on(table.status),
    check('file_size_positive', sql`${table.fileSizeBytes} >= 0`),
    check('version_positive', sql`${table.versionNumber} >= 1`),
  ]
);
