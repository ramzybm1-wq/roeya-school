/**
 * Schema: notifications, notification_preferences
 * In-app notification system with per-event channel preferences.
 */

import {
  pgTable, uuid, varchar, text, boolean, timestamp, index,
} from 'drizzle-orm/pg-core';
import { notificationPriorityEnum } from './enums';
import { users } from './users';
import { schools } from './schools';

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    schoolId: uuid('school_id')
      .references(() => schools.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .references(() => users.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 50 }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    message: text('message').notNull(),

    targetEntityType: varchar('target_entity_type', { length: 50 }),
    targetEntityId: uuid('target_entity_id'),

    isRead: boolean('is_read').notNull().default(false),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_notif_user').on(table.userId),
    index('idx_notif_created').on(table.createdAt),
  ]
);

export const notificationPreferences = pgTable(
  'notification_preferences',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    eventType: varchar('event_type', { length: 100 }).notNull(),
    inAppEnabled: boolean('in_app_enabled').notNull().default(true),
    emailEnabled: boolean('email_enabled').notNull().default(false),
    whatsappEnabled: boolean('whatsapp_enabled').notNull().default(false),
    smsEnabled: boolean('sms_enabled').notNull().default(false),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_np_user').on(table.userId),
  ]
);
