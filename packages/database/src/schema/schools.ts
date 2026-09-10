/**
 * Schema: schools
 * Multi-school establishment definitions with contact info, geolocation, structured opening hours, and visibility toggles.
 */

import { pgTable, uuid, varchar, text, boolean, timestamp, doublePrecision, jsonb, check } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const schools = pgTable(
  'schools',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    shortName: varchar('short_name', { length: 100 }),
    code: varchar('code', { length: 50 }).notNull().unique(),
    description: text('description'),

    // Contact
    phonePrimary: varchar('phone_primary', { length: 30 }),
    phoneSecondary: varchar('phone_secondary', { length: 30 }),
    whatsapp: varchar('whatsapp', { length: 30 }),
    emailPrimary: varchar('email_primary', { length: 255 }),
    emailSecondary: varchar('email_secondary', { length: 255 }),
    website: varchar('website', { length: 500 }),

    // Structured Opening Hours & Social links
    openingHoursJson: jsonb('opening_hours_json'), // [{ day: 'SUNDAY', openTime: '08:00', closeTime: '16:30', isClosed: false }, ...]
    socialLinksJson: jsonb('social_links_json'), // { facebook, instagram, tiktok, youtube, linkedin }

    // Public Contact Visibility Toggles
    isPhonePublic: boolean('is_phone_public').notNull().default(true),
    isEmailPublic: boolean('is_email_public').notNull().default(true),
    isWhatsappPublic: boolean('is_whatsapp_public').notNull().default(true),
    isMapPublic: boolean('is_map_public').notNull().default(true),

    // Address
    address: text('address'),
    wilaya: varchar('wilaya', { length: 100 }),
    commune: varchar('commune', { length: 100 }),
    postalCode: varchar('postal_code', { length: 10 }),
    country: varchar('country', { length: 100 }).default('Algérie'),

    // Geolocation
    latitude: doublePrecision('latitude'),
    longitude: doublePrecision('longitude'),
    googleMapsUrl: text('google_maps_url'),

    // Status
    status: varchar('status', { length: 30 }).notNull().default('ACTIVE'),
    isActive: boolean('is_active').notNull().default(true),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
  },
  (table) => [
    check('latitude_range', sql`${table.latitude} IS NULL OR (${table.latitude} BETWEEN -90 AND 90)`),
    check('longitude_range', sql`${table.longitude} IS NULL OR (${table.longitude} BETWEEN -180 AND 180)`),
  ]
);
