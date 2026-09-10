/**
 * Schema: media_assets, school_media_assignments, media_asset_versions
 * Public media management with responsive variants, focal point, and versioning.
 */

import {
  pgTable, uuid, varchar, integer, text, timestamp, boolean, index, check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { mediaStatusEnum, mediaTypeEnum, mediaPlacementEnum } from './enums';
import { schools } from './schools';

export const mediaAssets = pgTable(
  'media_assets',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    type: mediaTypeEnum('type').notNull().default('OTHER'),
    title: varchar('title', { length: 255 }),
    altTextFr: varchar('alt_text_fr', { length: 500 }),
    altTextAr: varchar('alt_text_ar', { length: 500 }),
    description: text('description'),

    schoolId: uuid('school_id')
      .references(() => schools.id, { onDelete: 'set null' }), // nullable for global media
    usageScope: varchar('usage_scope', { length: 50 }).default('SCHOOL'),
    status: mediaStatusEnum('status').notNull().default('DRAFT'),

    // Gallery and categorization
    galleryCategory: varchar('gallery_category', { length: 100 }),
    isFeatured: boolean('is_featured').notNull().default(false),

    // Focal point (0-100 normalized percentage)
    focalX: integer('focal_x'),
    focalY: integer('focal_y'),

    // Device Crop JSON metadata
    desktopCropJson: text('desktop_crop_json'),
    tabletCropJson: text('tablet_crop_json'),
    mobileCropJson: text('mobile_crop_json'),

    // Responsive asset keys
    originalAssetKey: varchar('original_asset_key', { length: 500 }).notNull(),
    desktopAssetKey: varchar('desktop_asset_key', { length: 500 }),
    tabletAssetKey: varchar('tablet_asset_key', { length: 500 }),
    mobileAssetKey: varchar('mobile_asset_key', { length: 500 }),

    // File metadata
    mimeType: varchar('mime_type', { length: 100 }),
    width: integer('width'),
    height: integer('height'),
    fileSizeBytes: integer('file_size_bytes'),
    displayOrder: integer('display_order').notNull().default(0),
    versionNumber: integer('version_number').notNull().default(1),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_media_school').on(table.schoolId),
    index('idx_media_status').on(table.status),
    index('idx_media_type').on(table.type),
    index('idx_media_gallery_cat').on(table.galleryCategory),
    check('media_file_size_positive', sql`${table.fileSizeBytes} IS NULL OR ${table.fileSizeBytes} >= 0`),
  ]
);

export const mediaAssetVersions = pgTable(
  'media_asset_versions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    mediaAssetId: uuid('media_asset_id')
      .notNull()
      .references(() => mediaAssets.id, { onDelete: 'cascade' }),
    versionNumber: integer('version_number').notNull(),

    originalAssetKey: varchar('original_asset_key', { length: 500 }).notNull(),
    desktopAssetKey: varchar('desktop_asset_key', { length: 500 }),
    tabletAssetKey: varchar('tablet_asset_key', { length: 500 }),
    mobileAssetKey: varchar('mobile_asset_key', { length: 500 }),

    width: integer('width'),
    height: integer('height'),
    mimeType: varchar('mime_type', { length: 100 }),
    fileSizeBytes: integer('file_size_bytes'),
    focalX: integer('focal_x'),
    focalY: integer('focal_y'),

    createdByUserId: uuid('created_by_user_id'),
    status: varchar('status', { length: 50 }).notNull().default('SUPERSEDED'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    publishedAt: timestamp('published_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_mav_asset').on(table.mediaAssetId),
    index('idx_mav_version').on(table.mediaAssetId, table.versionNumber),
  ]
);

export const schoolMediaAssignments = pgTable(
  'school_media_assignments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    schoolId: uuid('school_id')
      .notNull()
      .references(() => schools.id, { onDelete: 'cascade' }),
    mediaAssetId: uuid('media_asset_id')
      .notNull()
      .references(() => mediaAssets.id, { onDelete: 'cascade' }),
    placement: mediaPlacementEnum('placement').notNull(),
    displayOrder: integer('display_order').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('idx_sma_school').on(table.schoolId),
    index('idx_sma_media').on(table.mediaAssetId),
    index('idx_sma_placement').on(table.placement),
  ]
);

export type DbMediaAsset = typeof mediaAssets.$inferSelect;
export type DbInsertMediaAsset = typeof mediaAssets.$inferInsert;

export type DbMediaAssetVersion = typeof mediaAssetVersions.$inferSelect;
export type DbInsertMediaAssetVersion = typeof mediaAssetVersions.$inferInsert;

export type DbSchoolMediaAssignment = typeof schoolMediaAssignments.$inferSelect;
export type DbInsertSchoolMediaAssignment = typeof schoolMediaAssignments.$inferInsert;
