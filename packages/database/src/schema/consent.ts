/**
 * Schema: consent_records, policy_versions
 * Privacy and consent tracking for regulatory compliance.
 */

import {
  pgTable, uuid, varchar, text, boolean, timestamp, jsonb, index,
} from 'drizzle-orm/pg-core';
import { consentTypeEnum, policyTypeEnum, policyStatusEnum } from './enums';
import { registrations } from './registrations';

export const policyVersions = pgTable(
  'policy_versions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    policyType: policyTypeEnum('policy_type').notNull(),
    version: varchar('version', { length: 30 }).notNull(),
    contentFr: text('content_fr'),
    contentAr: text('content_ar'),
    status: policyStatusEnum('status').notNull().default('DRAFT'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    effectiveAt: timestamp('effective_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_pv_type').on(table.policyType),
    index('idx_pv_status').on(table.status),
  ]
);

export const consentRecords = pgTable(
  'consent_records',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    registrationId: uuid('registration_id')
      .notNull()
      .references(() => registrations.id, { onDelete: 'cascade' }),
    consentType: consentTypeEnum('consent_type').notNull(),
    policyVersion: varchar('policy_version', { length: 30 }),
    accepted: boolean('accepted').notNull().default(false),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    source: varchar('source', { length: 50 }),
    metadataJson: jsonb('metadata_json'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_cr_registration').on(table.registrationId),
  ]
);
