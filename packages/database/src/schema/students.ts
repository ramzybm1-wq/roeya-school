/**
 * Schema: students
 * Student records with biographical data.
 */

import { pgTable, uuid, varchar, date, timestamp, index } from 'drizzle-orm/pg-core';
import { genderEnum } from './enums';

export const students = pgTable(
  'students',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    fullName: varchar('full_name', { length: 300 }).notNull(),
    firstName: varchar('first_name', { length: 150 }),
    lastName: varchar('last_name', { length: 150 }),
    birthDate: date('birth_date').notNull(),
    birthPlace: varchar('birth_place', { length: 255 }),
    gender: genderEnum('gender').notNull(),
    currentSchool: varchar('current_school', { length: 255 }),
    wilaya: varchar('wilaya', { length: 100 }),
    commune: varchar('commune', { length: 100 }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_students_name').on(table.fullName),
    index('idx_students_birthdate').on(table.birthDate),
  ]
);
