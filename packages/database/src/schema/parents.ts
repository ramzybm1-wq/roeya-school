/**
 * Schema: parents
 * Parent/guardian records. Phone is indexed for lookup but not globally unique
 * (families may submit multiple children).
 */

import { pgTable, uuid, varchar, text, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from './users';

export const parents = pgTable(
  'parents',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'set null' }),
    fullName: varchar('full_name', { length: 300 }).notNull(),
    address: text('address'),
    phonePrimary: varchar('phone_primary', { length: 30 }).notNull(),
    phoneSecondary: varchar('phone_secondary', { length: 30 }),
    whatsapp: varchar('whatsapp', { length: 30 }),
    email: varchar('email', { length: 255 }),
    wilaya: varchar('wilaya', { length: 100 }),
    commune: varchar('commune', { length: 100 }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_parents_phone').on(table.phonePrimary),
    index('idx_parents_user').on(table.userId),
  ]
);
