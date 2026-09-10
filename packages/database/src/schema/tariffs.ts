/**
 * Schema: tariffs
 * Tuition/fee configuration per school_year_level. Immutable for historical pricing.
 * Registrations store a price snapshot — tariff records are never destructively modified.
 */

import {
  pgTable, uuid, integer, varchar, text, boolean, timestamp, index, check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { schoolYearLevels } from './school-year-levels';

export const tariffs = pgTable(
  'tariffs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    schoolYearLevelId: uuid('school_year_level_id')
      .notNull()
      .references(() => schoolYearLevels.id, { onDelete: 'restrict' }),

    amount: integer('amount').notNull(), // in smallest currency unit (centimes or DZD)
    currency: varchar('currency', { length: 10 }).notNull().default('DZD'),

    // Client visibility
    showClient: boolean('show_client').notNull().default(true),
    hiddenClientMessageFr: text('hidden_client_message_fr'),
    hiddenClientMessageAr: text('hidden_client_message_ar'),

    // Validity / versioning
    status: varchar('status', { length: 30 }).notNull().default('ACTIVE'),
    validFrom: timestamp('valid_from', { withTimezone: true }),
    validTo: timestamp('valid_to', { withTimezone: true }),

    // Audit
    createdBy: uuid('created_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_tariffs_syl').on(table.schoolYearLevelId),
    check('tariff_amount_positive', sql`${table.amount} >= 0`),
  ]
);
