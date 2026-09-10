/**
 * Schema: waiting_list_entries
 * Waiting list management. Position is computed from priority rules + entered_at — not stored as mutable truth.
 */

import {
  pgTable, uuid, varchar, integer, timestamp, text, index,
} from 'drizzle-orm/pg-core';
import { waitingListStatusEnum, waitingListOfferStatusEnum } from './enums';
import { registrations } from './registrations';
import { schoolYearLevels } from './school-year-levels';

export const waitingListEntries = pgTable(
  'waiting_list_entries',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    registrationId: uuid('registration_id')
      .notNull()
      .references(() => registrations.id, { onDelete: 'cascade' }),
    schoolYearLevelId: uuid('school_year_level_id')
      .notNull()
      .references(() => schoolYearLevels.id, { onDelete: 'restrict' }),

    enteredAt: timestamp('entered_at', { withTimezone: true }).notNull().defaultNow(),
    originalPosition: integer('original_position'), // historical reference only

    // Priority
    priorityType: varchar('priority_type', { length: 50 }),
    priorityReason: text('priority_reason'),
    manualPriority: integer('manual_priority'),

    // Status
    status: waitingListStatusEnum('status').notNull().default('ACTIVE'),

    // Skip / Hold Management
    skippedAt: timestamp('skipped_at', { withTimezone: true }),
    skipReason: text('skip_reason'),
    skipReviewAt: timestamp('skip_review_at', { withTimezone: true }),

    // Offer Management
    offerStatus: waitingListOfferStatusEnum('offer_status'),
    offerCreatedAt: timestamp('offer_created_at', { withTimezone: true }),
    offerExpiresAt: timestamp('offer_expires_at', { withTimezone: true }),
    acceptedFromWaitlistAt: timestamp('accepted_from_waitlist_at', { withTimezone: true }),

    // Removal Management
    removedAt: timestamp('removed_at', { withTimezone: true }),
    removeReason: text('remove_reason'),
    removeReasonCode: varchar('remove_reason_code', { length: 50 }),

    // Transfers
    transferFromEntryId: uuid('transfer_from_entry_id'),
    transferToEntryId: uuid('transfer_to_entry_id'),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_wl_syl').on(table.schoolYearLevelId),
    index('idx_wl_entered').on(table.enteredAt),
    index('idx_wl_status').on(table.status),
    index('idx_wl_registration').on(table.registrationId),
  ]
);

export type DbWaitingListEntry = typeof waitingListEntries.$inferSelect;
export type DbInsertWaitingListEntry = typeof waitingListEntries.$inferInsert;
