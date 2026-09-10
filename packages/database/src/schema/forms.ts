/**
 * Schema: form_definitions, form_sections, form_fields, registration_custom_field_values
 * Dynamic registration form builder with conditional logic, system-protected fields, and custom responses.
 */

import {
  pgTable, uuid, varchar, integer, boolean, timestamp, text, jsonb, index,
} from 'drizzle-orm/pg-core';
import { formStatusEnum, formFieldTypeEnum } from './enums';
import { schools } from './schools';
import { academicYears } from './academic-years';
import { registrations } from './registrations';

export const formDefinitions = pgTable(
  'form_definitions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    schoolId: uuid('school_id')
      .references(() => schools.id, { onDelete: 'set null' }), // nullable for global forms
    academicYearId: uuid('academic_year_id')
      .references(() => academicYears.id, { onDelete: 'set null' }), // nullable if reusable
    version: integer('version').notNull().default(1),
    status: formStatusEnum('status').notNull().default('DRAFT'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdByUserId: uuid('created_by_user_id'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_fd_school').on(table.schoolId),
    index('idx_fd_status').on(table.status),
  ]
);

export const formSections = pgTable(
  'form_sections',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    formDefinitionId: uuid('form_definition_id')
      .notNull()
      .references(() => formDefinitions.id, { onDelete: 'cascade' }),
    key: varchar('key', { length: 100 }).notNull(),
    labelFr: varchar('label_fr', { length: 255 }).notNull(),
    labelAr: varchar('label_ar', { length: 255 }),
    displayOrder: integer('display_order').notNull().default(0),
    isVisible: boolean('is_visible').notNull().default(true),
    descriptionFr: text('description_fr'),
    descriptionAr: text('description_ar'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_fs_form').on(table.formDefinitionId),
  ]
);

export const formFields = pgTable(
  'form_fields',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    formSectionId: uuid('form_section_id')
      .notNull()
      .references(() => formSections.id, { onDelete: 'cascade' }),
    fieldKey: varchar('field_key', { length: 100 }).notNull(),
    fieldType: formFieldTypeEnum('field_type').notNull(),

    // Labels
    labelFr: varchar('label_fr', { length: 255 }).notNull(),
    labelAr: varchar('label_ar', { length: 255 }),
    placeholderFr: varchar('placeholder_fr', { length: 255 }),
    placeholderAr: varchar('placeholder_ar', { length: 255 }),
    helpTextFr: text('help_text_fr'),
    helpTextAr: text('help_text_ar'),

    // Behavior
    isVisible: boolean('is_visible').notNull().default(true),
    isRequired: boolean('is_required').notNull().default(false),
    isEditableClient: boolean('is_editable_client').notNull().default(true),
    isSystemProtected: boolean('is_system_protected').notNull().default(false),

    // JSON-based configuration
    defaultValueJson: jsonb('default_value_json'),
    optionsJson: jsonb('options_json'), // for SELECT, RADIO, CHECKBOX, MULTISELECT
    validationJson: jsonb('validation_json'), // min, max, regex, etc.
    conditionalLogicJson: jsonb('conditional_logic_json'), // show/hide based on other fields
    scopeJson: jsonb('scope_json'), // schoolId, cycleId, levelId, choiceId scoping

    // Display
    displayOrder: integer('display_order').notNull().default(0),
    width: varchar('width', { length: 20 }).default('full'), // 'full', 'half', 'third'

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_ff_section').on(table.formSectionId),
    index('idx_ff_key').on(table.fieldKey),
  ]
);

export const registrationCustomFieldValues = pgTable(
  'registration_custom_field_values',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    registrationId: uuid('registration_id')
      .notNull()
      .references(() => registrations.id, { onDelete: 'cascade' }),
    formFieldId: uuid('form_field_id')
      .notNull()
      .references(() => formFields.id, { onDelete: 'restrict' }),
    valueJson: jsonb('value_json'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_rcfv_registration').on(table.registrationId),
    index('idx_rcfv_field').on(table.formFieldId),
  ]
);
