/**
 * Schema: faq_items, contact_messages, public_content_blocks
 * Public-facing content entities.
 */

import {
  pgTable, uuid, varchar, text, integer, boolean, timestamp, jsonb, index,
} from 'drizzle-orm/pg-core';
import { faqStatusEnum, contactMessageStatusEnum, contentBlockStatusEnum } from './enums';
import { schools } from './schools';
import { users } from './users';

export const faqItems = pgTable(
  'faq_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    schoolId: uuid('school_id')
      .references(() => schools.id, { onDelete: 'set null' }), // nullable for global
    category: varchar('category', { length: 100 }),
    questionFr: text('question_fr').notNull(),
    questionAr: text('question_ar'),
    answerFr: text('answer_fr').notNull(),
    answerAr: text('answer_ar'),
    keywordsJson: jsonb('keywords_json'),
    displayOrder: integer('display_order').notNull().default(0),
    isFeatured: boolean('is_featured').notNull().default(false),
    status: faqStatusEnum('status').notNull().default('DRAFT'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    publishedAt: timestamp('published_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_faq_status').on(table.status),
    index('idx_faq_school').on(table.schoolId),
  ]
);

export const contactMessages = pgTable(
  'contact_messages',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    schoolId: uuid('school_id')
      .references(() => schools.id, { onDelete: 'set null' }), // nullable
    fullName: varchar('full_name', { length: 300 }).notNull(),
    phone: varchar('phone', { length: 30 }),
    email: varchar('email', { length: 255 }),
    subject: varchar('subject', { length: 500 }),
    message: text('message').notNull(),
    status: contactMessageStatusEnum('status').notNull().default('NEW'),
    assignedUserId: uuid('assigned_user_id')
      .references(() => users.id, { onDelete: 'set null' }), // nullable
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_cm_status').on(table.status),
    index('idx_cm_created').on(table.createdAt),
  ]
);

export const publicContentBlocks = pgTable(
  'public_content_blocks',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    schoolId: uuid('school_id')
      .references(() => schools.id, { onDelete: 'set null' }), // nullable
    page: varchar('page', { length: 100 }).notNull(),
    sectionKey: varchar('section_key', { length: 100 }).notNull(),
    contentJson: jsonb('content_json'),
    status: contentBlockStatusEnum('status').notNull().default('DRAFT'),
    displayOrder: integer('display_order').notNull().default(0),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    publishedAt: timestamp('published_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_pcb_page').on(table.page),
    index('idx_pcb_school').on(table.schoolId),
  ]
);
