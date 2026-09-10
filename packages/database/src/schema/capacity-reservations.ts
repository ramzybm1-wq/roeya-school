/**
 * Schema: capacity_reservations
 * Manages temporary capacity holds for place offer flows.
 */

import {
  pgTable, uuid, timestamp, index,
} from 'drizzle-orm/pg-core';
import { capacityReservationStatusEnum } from './enums';
import { registrations } from './registrations';
import { schoolYearLevels } from './school-year-levels';
import { waitingListEntries } from './waiting-list';

export const capacityReservations = pgTable(
  'capacity_reservations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    schoolYearLevelId: uuid('school_year_level_id')
      .notNull()
      .references(() => schoolYearLevels.id, { onDelete: 'restrict' }),
    registrationId: uuid('registration_id')
      .notNull()
      .references(() => registrations.id, { onDelete: 'cascade' }),
    waitingListEntryId: uuid('waiting_list_entry_id')
      .references(() => waitingListEntries.id, { onDelete: 'set null' }),

    status: capacityReservationStatusEnum('status').notNull().default('ACTIVE'),

    reservedAt: timestamp('reserved_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    releasedAt: timestamp('released_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_cr_syl').on(table.schoolYearLevelId),
    index('idx_cr_status').on(table.status),
    index('idx_cr_expires').on(table.expiresAt),
    index('idx_cr_registration').on(table.registrationId),
  ]
);

export type DbCapacityReservation = typeof capacityReservations.$inferSelect;
export type DbInsertCapacityReservation = typeof capacityReservations.$inferInsert;
