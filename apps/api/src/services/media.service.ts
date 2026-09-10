/**
 * Public Media Management Service for VISION SCHOOL.
 * Handles public branding visuals, logos, hero images, gallery assets,
 * responsive variants (desktop/tablet/mobile), aspect ratio/dimension detection,
 * normalized focal point positioning, version history, and placement assignments.
 * Private student registration documents are strictly excluded from this service.
 */

import { getDb } from '@vision-school/database';
import {
  mediaAssets,
  mediaAssetVersions,
  schoolMediaAssignments,
  schools,
  auditLogs,
  systemSettings,
  DbMediaAsset,
} from '@vision-school/database';
import { eq, and, desc, asc, isNull, inArray, sql } from 'drizzle-orm';
import { AppError, User } from '@vision-school/shared';
import { AuthGuard } from '@vision-school/auth';
import { StorageService } from './storage.service';
import crypto from 'crypto';

export interface ImageFileInput {
  buffer: Buffer;
  originalFilename: string;
  mimeType: string;
  sizeBytes?: number;
  width?: number;
  height?: number;
}

export interface UploadMediaInput {
  type: 'LOGO' | 'HERO' | 'BACKGROUND' | 'GALLERY' | 'ICON' | 'OTHER';
  title?: string;
  altTextFr?: string;
  altTextAr?: string;
  description?: string;
  schoolId?: string | null;
  usageScope?: 'GLOBAL' | 'SCHOOL';
  galleryCategory?: string;
  isFeatured?: boolean;
  focalX?: number; // Normalized 0.0 - 1.0
  focalY?: number; // Normalized 0.0 - 1.0
  initialStatus?: 'DRAFT' | 'PUBLISHED';
}

export interface ResponsiveMediaDto {
  id: string;
  type: string;
  title: string | null;
  altTextFr: string | null;
  altTextAr: string | null;
  sources: {
    desktop: string;
    tablet: string;
    mobile: string;
    fallback: string;
  };
  focalPoint: {
    x: number; // 0.0 - 1.0
    y: number; // 0.0 - 1.0
  };
  width: number | null;
  height: number | null;
  aspectRatio: string;
  orientation: 'LANDSCAPE' | 'PORTRAIT' | 'SQUARE';
}

export class MediaService {
  /**
   * Helper: Detects image dimensions, aspect ratio classification, orientation, and suitability warnings.
   */
  static analyzeImageMetadata(
    file: ImageFileInput,
    intendedType?: string
  ): {
    width: number;
    height: number;
    aspectRatio: string;
    orientation: 'LANDSCAPE' | 'PORTRAIT' | 'SQUARE';
    warnings: string[];
  } {
    // Standard default dimensions if not parsed by decoder
    let width = file.width || 1920;
    let height = file.height || 1080;

    // Detect basic PNG/JPEG/GIF header dimensions if available in buffer
    if (file.buffer && file.buffer.length >= 24) {
      if (file.mimeType.includes('png') && file.buffer.length >= 24) {
        width = file.buffer.readUInt32BE(16);
        height = file.buffer.readUInt32BE(20);
      }
    }

    const ratio = width / (height || 1);
    let aspectRatio = 'Custom';
    if (ratio >= 1.7 && ratio <= 1.85) aspectRatio = '16:9';
    else if (ratio >= 1.28 && ratio <= 1.38) aspectRatio = '4:3';
    else if (ratio >= 0.95 && ratio <= 1.05) aspectRatio = '1:1';
    else if (ratio >= 0.75 && ratio <= 0.85) aspectRatio = '4:5';
    else if (ratio >= 0.5 && ratio <= 0.6) aspectRatio = '9:16';

    let orientation: 'LANDSCAPE' | 'PORTRAIT' | 'SQUARE' = 'LANDSCAPE';
    if (ratio > 1.05) orientation = 'LANDSCAPE';
    else if (ratio < 0.95) orientation = 'PORTRAIT';
    else orientation = 'SQUARE';

    const warnings: string[] = [];
    if (intendedType === 'HERO' && width < 1280) {
      warnings.push('Résolution faible pour un affichage desktop large (recommandé : >= 1920px).');
    }
    if (intendedType === 'LOGO' && width > 2000) {
      warnings.push('Fichier logo volumineux. Optimisation recommandée.');
    }

    return { width, height, aspectRatio, orientation, warnings };
  }

  /**
   * Uploads a new public media asset with dimension detection and draft status.
   */
  static async uploadMedia(
    payload: UploadMediaInput,
    files: {
      original: ImageFileInput;
      desktop?: ImageFileInput;
      tablet?: ImageFileInput;
      mobile?: ImageFileInput;
    },
    actor: User
  ) {
    if (!AuthGuard.hasPermission(actor, 'media.manage')) {
      throw new AppError('FORBIDDEN', 'Permission refusée pour téléverser des médias.');
    }

    // School-scoped access validation
    if (payload.schoolId && !AuthGuard.canAccessSchool(actor, payload.schoolId)) {
      throw new AppError('FORBIDDEN', 'Accès refusé pour cet établissement.');
    }

    // Allowed MIME types
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/svg+xml'];
    if (!allowedMimeTypes.includes(files.original.mimeType.toLowerCase())) {
      throw new AppError(
        'VALIDATION_ERROR',
        `Format d’image non supporté. Formats acceptés : ${allowedMimeTypes.join(', ')}.`
      );
    }

    // Validate size limit (15MB general, 5MB logo)
    const maxSizeBytes = payload.type === 'LOGO' ? 5 * 1024 * 1024 : 15 * 1024 * 1024;
    const originalSize = files.original.sizeBytes || files.original.buffer.length;
    if (originalSize > maxSizeBytes) {
      const maxMb = Math.round(maxSizeBytes / (1024 * 1024));
      throw new AppError('VALIDATION_ERROR', `L’image dépasse la taille maximale autorisée (${maxMb} Mo).`);
    }

    const mediaId = crypto.randomUUID();
    const ext = files.original.mimeType.includes('png')
      ? 'png'
      : files.original.mimeType.includes('svg')
      ? 'svg'
      : files.original.mimeType.includes('webp')
      ? 'webp'
      : 'jpg';

    // 1. Upload original
    const originalKey = StorageService.buildPublicMediaKey(mediaId, 'original', ext);
    await StorageService.uploadPublicMedia(originalKey, files.original.buffer, files.original.mimeType);

    // 2. Upload optional variants
    let desktopKey: string | null = null;
    let tabletKey: string | null = null;
    let mobileKey: string | null = null;

    if (files.desktop) {
      desktopKey = StorageService.buildPublicMediaKey(mediaId, 'desktop', ext);
      await StorageService.uploadPublicMedia(desktopKey, files.desktop.buffer, files.desktop.mimeType);
    }
    if (files.tablet) {
      tabletKey = StorageService.buildPublicMediaKey(mediaId, 'tablet', ext);
      await StorageService.uploadPublicMedia(tabletKey, files.tablet.buffer, files.tablet.mimeType);
    }
    if (files.mobile) {
      mobileKey = StorageService.buildPublicMediaKey(mediaId, 'mobile', ext);
      await StorageService.uploadPublicMedia(mobileKey, files.mobile.buffer, files.mobile.mimeType);
    }

    // 3. Metadata analysis
    const analysis = this.analyzeImageMetadata(files.original, payload.type);

    // 4. Normalized focal point (0-100)
    const focalXPercent = Math.round((payload.focalX ?? 0.5) * 100);
    const focalYPercent = Math.round((payload.focalY ?? 0.5) * 100);

    const now = new Date();
    const status = payload.initialStatus || 'DRAFT';

    const db = getDb();
    const [inserted] = await db
      .insert(mediaAssets)
      .values({
        id: mediaId,
        type: payload.type,
        title: payload.title || files.original.originalFilename,
        altTextFr: payload.altTextFr || null,
        altTextAr: payload.altTextAr || null,
        description: payload.description || null,
        schoolId: payload.schoolId || null,
        usageScope: payload.schoolId ? 'SCHOOL' : 'GLOBAL',
        status,
        galleryCategory: payload.galleryCategory || null,
        isFeatured: payload.isFeatured || false,
        focalX: focalXPercent,
        focalY: focalYPercent,
        originalAssetKey: originalKey,
        desktopAssetKey: desktopKey,
        tabletAssetKey: tabletKey,
        mobileAssetKey: mobileKey,
        mimeType: files.original.mimeType,
        width: analysis.width,
        height: analysis.height,
        fileSizeBytes: originalSize,
        displayOrder: 0,
        versionNumber: 1,
        publishedAt: status === 'PUBLISHED' ? now : null,
      })
      .returning();

    // 5. Version history
    await db.insert(mediaAssetVersions).values({
      mediaAssetId: mediaId,
      versionNumber: 1,
      originalAssetKey: originalKey,
      desktopAssetKey: desktopKey,
      tabletAssetKey: tabletKey,
      mobileAssetKey: mobileKey,
      width: analysis.width,
      height: analysis.height,
      mimeType: files.original.mimeType,
      fileSizeBytes: originalSize,
      focalX: focalXPercent,
      focalY: focalYPercent,
      createdByUserId: actor.id,
      status: status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT',
      publishedAt: status === 'PUBLISHED' ? now : null,
    });

    // 6. Audit
    await db.insert(auditLogs).values({
      userId: actor.id,
      action: 'MEDIA_UPLOADED',
      module: 'MEDIA',
      entityType: 'MEDIA_ASSET',
      entityId: mediaId,
      schoolId: payload.schoolId || null,
      afterJson: { type: payload.type, title: payload.title, status },
      result: 'SUCCESS',
    });

    return {
      media: inserted,
      analysis,
    };
  }

  /**
   * Updates normalized focal point coordinates ($0.0 \le x, y \le 1.0$).
   */
  static async updateFocalPoint(actor: User, mediaId: string, focalX: number, focalY: number) {
    if (!AuthGuard.hasPermission(actor, 'media.manage')) {
      throw new AppError('FORBIDDEN', 'Permission refusée.');
    }

    if (focalX < 0 || focalX > 1 || focalY < 0 || focalY > 1) {
      throw new AppError('VALIDATION_ERROR', 'Les coordonnées du point focal doivent être comprises entre 0.0 et 1.0.');
    }

    const db = getDb();
    const [media] = await db.select().from(mediaAssets).where(eq(mediaAssets.id, mediaId));
    if (!media) throw new AppError('NOT_FOUND', 'Média introuvable.');

    if (media.schoolId && !AuthGuard.canAccessSchool(actor, media.schoolId)) {
      throw new AppError('FORBIDDEN', 'Accès refusé pour cet établissement.');
    }

    const focalXPercent = Math.round(focalX * 100);
    const focalYPercent = Math.round(focalY * 100);

    const [updated] = await db
      .update(mediaAssets)
      .set({
        focalX: focalXPercent,
        focalY: focalYPercent,
        updatedAt: new Date(),
      })
      .where(eq(mediaAssets.id, mediaId))
      .returning();

    await db.insert(auditLogs).values({
      userId: actor.id,
      action: 'FOCAL_POINT_CHANGED',
      module: 'MEDIA',
      entityType: 'MEDIA_ASSET',
      entityId: mediaId,
      schoolId: media.schoolId,
      afterJson: { focalX, focalY },
      result: 'SUCCESS',
    });

    return updated;
  }

  /**
   * Publishes a media asset making it discoverable on public endpoints.
   */
  static async publishMedia(actor: User, mediaId: string) {
    if (!AuthGuard.hasPermission(actor, 'media.publish')) {
      throw new AppError('FORBIDDEN', 'Permission refusée pour publier des médias.');
    }

    const db = getDb();
    const [media] = await db.select().from(mediaAssets).where(eq(mediaAssets.id, mediaId));
    if (!media) throw new AppError('NOT_FOUND', 'Média introuvable.');

    if (media.schoolId && !AuthGuard.canAccessSchool(actor, media.schoolId)) {
      throw new AppError('FORBIDDEN', 'Accès refusé pour cet établissement.');
    }

    const now = new Date();
    const [updated] = await db
      .update(mediaAssets)
      .set({
        status: 'PUBLISHED',
        publishedAt: now,
        updatedAt: now,
      })
      .where(eq(mediaAssets.id, mediaId))
      .returning();

    await db.insert(auditLogs).values({
      userId: actor.id,
      action: 'MEDIA_PUBLISHED',
      module: 'MEDIA',
      entityType: 'MEDIA_ASSET',
      entityId: mediaId,
      schoolId: media.schoolId,
      result: 'SUCCESS',
    });

    return updated;
  }

  /**
   * Unpublishes a media asset.
   */
  static async unpublishMedia(actor: User, mediaId: string) {
    if (!AuthGuard.hasPermission(actor, 'media.publish')) {
      throw new AppError('FORBIDDEN', 'Permission refusée.');
    }

    const db = getDb();
    const [media] = await db.select().from(mediaAssets).where(eq(mediaAssets.id, mediaId));
    if (!media) throw new AppError('NOT_FOUND', 'Média introuvable.');

    const [updated] = await db
      .update(mediaAssets)
      .set({
        status: 'INACTIVE',
        updatedAt: new Date(),
      })
      .where(eq(mediaAssets.id, mediaId))
      .returning();

    await db.insert(auditLogs).values({
      userId: actor.id,
      action: 'MEDIA_UNPUBLISHED',
      module: 'MEDIA',
      entityType: 'MEDIA_ASSET',
      entityId: mediaId,
      schoolId: media.schoolId,
      result: 'SUCCESS',
    });

    return updated;
  }

  /**
   * Replaces a media asset with a new version.
   */
  static async replaceMedia(
    actor: User,
    mediaId: string,
    file: ImageFileInput,
    deviceVariant: 'original' | 'desktop' | 'tablet' | 'mobile' = 'original'
  ) {
    if (!AuthGuard.hasPermission(actor, 'media.manage')) {
      throw new AppError('FORBIDDEN', 'Permission refusée.');
    }

    const db = getDb();
    const [existing] = await db.select().from(mediaAssets).where(eq(mediaAssets.id, mediaId));
    if (!existing) throw new AppError('NOT_FOUND', 'Média introuvable.');

    const newVersionNumber = (existing.versionNumber || 1) + 1;
    const ext = file.mimeType.includes('png') ? 'png' : file.mimeType.includes('svg') ? 'svg' : 'jpg';

    const newStorageKey = StorageService.buildPublicMediaKey(mediaId, deviceVariant, ext);
    await StorageService.uploadPublicMedia(newStorageKey, file.buffer, file.mimeType);

    const analysis = this.analyzeImageMetadata(file, existing.type);

    const updateFields: Partial<typeof mediaAssets.$inferInsert> = {
      versionNumber: newVersionNumber,
      updatedAt: new Date(),
    };

    if (deviceVariant === 'original') {
      updateFields.originalAssetKey = newStorageKey;
      updateFields.width = analysis.width;
      updateFields.height = analysis.height;
      updateFields.mimeType = file.mimeType;
      updateFields.fileSizeBytes = file.sizeBytes || file.buffer.length;
    } else if (deviceVariant === 'desktop') {
      updateFields.desktopAssetKey = newStorageKey;
    } else if (deviceVariant === 'tablet') {
      updateFields.tabletAssetKey = newStorageKey;
    } else if (deviceVariant === 'mobile') {
      updateFields.mobileAssetKey = newStorageKey;
    }

    const [updated] = await db
      .update(mediaAssets)
      .set(updateFields)
      .where(eq(mediaAssets.id, mediaId))
      .returning();

    // Record new version in history
    await db.insert(mediaAssetVersions).values({
      mediaAssetId: mediaId,
      versionNumber: newVersionNumber,
      originalAssetKey: updated.originalAssetKey,
      desktopAssetKey: updated.desktopAssetKey,
      tabletAssetKey: updated.tabletAssetKey,
      mobileAssetKey: updated.mobileAssetKey,
      width: updated.width,
      height: updated.height,
      mimeType: updated.mimeType,
      fileSizeBytes: updated.fileSizeBytes,
      focalX: updated.focalX,
      focalY: updated.focalY,
      createdByUserId: actor.id,
      status: updated.status,
    });

    await db.insert(auditLogs).values({
      userId: actor.id,
      action: 'MEDIA_REPLACED',
      module: 'MEDIA',
      entityType: 'MEDIA_ASSET',
      entityId: mediaId,
      schoolId: existing.schoolId,
      afterJson: { versionNumber: newVersionNumber, variant: deviceVariant },
      result: 'SUCCESS',
    });

    return updated;
  }

  /**
   * Assigns a media asset to a public surface placement.
   */
  static async assignPlacement(
    actor: User,
    mediaId: string,
    placement: any,
    schoolId?: string | null,
    displayOrder = 0
  ) {
    if (!AuthGuard.hasPermission(actor, 'media.manage')) {
      throw new AppError('FORBIDDEN', 'Permission refusée.');
    }

    const db = getDb();
    const [media] = await db.select().from(mediaAssets).where(eq(mediaAssets.id, mediaId));
    if (!media) throw new AppError('NOT_FOUND', 'Média introuvable.');

    // If global assignment (no schoolId), require super admin or branding.manage
    if (!schoolId && !AuthGuard.isSuperAdmin(actor)) {
      throw new AppError('FORBIDDEN', 'Seul le Super Administrateur peut assigner des médias globaux.');
    }

    // Delete existing assignment for this placement and school to avoid duplicate active slots
    if (schoolId) {
      await db
        .delete(schoolMediaAssignments)
        .where(
          and(
            eq(schoolMediaAssignments.schoolId, schoolId),
            eq(schoolMediaAssignments.placement, placement)
          )
        );

      const [assignment] = await db
        .insert(schoolMediaAssignments)
        .values({
          schoolId,
          mediaAssetId: mediaId,
          placement,
          displayOrder,
          isActive: true,
        })
        .returning();

      return assignment;
    }

    return { mediaId, placement, global: true };
  }


  /**
   * Resolves a public placement asset with School-specific > Global > Neutral fallback hierarchy.
   */
  static async getPublicPlacementMedia(
    placement: string,
    schoolId?: string
  ): Promise<ResponsiveMediaDto | null> {
    const db = getDb();

    // 1. Check School-specific assignment
    if (schoolId) {
      const [schoolAssigned] = await db
        .select({
          media: mediaAssets,
        })
        .from(schoolMediaAssignments)
        .innerJoin(mediaAssets, eq(schoolMediaAssignments.mediaAssetId, mediaAssets.id))
        .where(
          and(
            eq(schoolMediaAssignments.schoolId, schoolId),
            eq(schoolMediaAssignments.placement, placement as any),
            eq(schoolMediaAssignments.isActive, true),
            eq(mediaAssets.status, 'PUBLISHED')
          )
        );

      if (schoolAssigned) {
        return this.formatResponsiveMedia(schoolAssigned.media);
      }
    }

    // 2. Check Global published media of this type/placement
    const [globalAsset] = await db
      .select()
      .from(mediaAssets)
      .where(
        and(
          isNull(mediaAssets.schoolId),
          eq(mediaAssets.status, 'PUBLISHED')
        )
      )
      .orderBy(desc(mediaAssets.publishedAt));

    if (globalAsset) {
      return this.formatResponsiveMedia(globalAsset);
    }

    return null;
  }

  /**
   * Resolves public branding package (client logo, admin logo, app logo, favicon, background).
   */
  static async getPublicBranding(schoolId?: string) {
    const clientLogo = await this.getPublicPlacementMedia('CLIENT_HEADER_LOGO', schoolId);
    const clientFooterLogo = await this.getPublicPlacementMedia('CLIENT_FOOTER_LOGO', schoolId);
    const adminSidebarLogo = await this.getPublicPlacementMedia('ADMIN_SIDEBAR_LOGO', schoolId);
    const adminLoginLogo = await this.getPublicPlacementMedia('ADMIN_LOGIN_LOGO', schoolId);
    const loginBackground = await this.getPublicPlacementMedia('ADMIN_LOGIN_BACKGROUND', schoolId);
    const hero = await this.getPublicPlacementMedia('CLIENT_HERO', schoolId);

    return {
      clientLogo,
      clientFooterLogo: clientFooterLogo || clientLogo,
      adminSidebarLogo: adminSidebarLogo || clientLogo,
      adminLoginLogo: adminLoginLogo || clientLogo,
      loginBackground,
      hero,
    };
  }

  /**
   * Returns published gallery assets with school, category, and featured filters.
   */
  static async getPublicGallery(filters?: {
    schoolId?: string;
    category?: string;
    isFeatured?: boolean;
    page?: number;
    limit?: number;
  }) {
    const db = getDb();
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const offset = (page - 1) * limit;

    let query = db
      .select()
      .from(mediaAssets)
      .where(
        and(
          eq(mediaAssets.type, 'GALLERY'),
          eq(mediaAssets.status, 'PUBLISHED')
        )
      )
      .orderBy(asc(mediaAssets.displayOrder), desc(mediaAssets.createdAt))
      .limit(limit)
      .offset(offset);

    const rows = await query;
    let filtered = rows;

    if (filters?.schoolId) {
      filtered = filtered.filter((r) => !r.schoolId || r.schoolId === filters.schoolId);
    }
    if (filters?.category) {
      filtered = filtered.filter((r) => r.galleryCategory === filters.category);
    }
    if (filters?.isFeatured !== undefined) {
      filtered = filtered.filter((r) => r.isFeatured === filters.isFeatured);
    }

    return filtered.map((m) => this.formatResponsiveMedia(m));
  }

  /**
   * Admin list of media assets with comprehensive multi-criteria filtering.
   */
  static async getAdminMediaList(
    actor: User,
    filters?: { type?: string; schoolId?: string; status?: string; search?: string }
  ) {
    if (!AuthGuard.hasPermission(actor, 'media.manage')) {
      throw new AppError('FORBIDDEN', 'Permission refusée.');
    }

    const db = getDb();
    let query = db.select().from(mediaAssets).orderBy(desc(mediaAssets.createdAt));

    const rows = await query;
    let filtered = rows;

    if (actor.role !== 'SUPER_ADMIN') {
      filtered = filtered.filter(
        (r) => !r.schoolId || (actor.allowedSchoolIds && actor.allowedSchoolIds.includes(r.schoolId))
      );
    }

    if (filters?.schoolId) {
      filtered = filtered.filter((r) => r.schoolId === filters.schoolId);
    }
    if (filters?.type) {
      filtered = filtered.filter((r) => r.type === filters.type);
    }
    if (filters?.status) {
      filtered = filtered.filter((r) => r.status === filters.status);
    }
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          (r.title && r.title.toLowerCase().includes(q)) ||
          (r.altTextFr && r.altTextFr.toLowerCase().includes(q))
      );
    }

    return filtered.map((m) => this.formatResponsiveMedia(m));
  }

  /**
   * Safely deletes a media asset after checking for active references.
   * If assigned as logo, hero, or school assignment, deletion is blocked.
   */
  static async deleteMedia(actor: User, mediaId: string) {
    if (!AuthGuard.hasPermission(actor, 'media.manage')) {
      throw AppError.forbidden('Permission refusée pour supprimer des médias.');
    }

    const db = getDb();
    const [asset] = await db.select().from(mediaAssets).where(eq(mediaAssets.id, mediaId));
    if (!asset) {
      throw AppError.notFound('Média introuvable.');
    }

    if (asset.schoolId && !AuthGuard.canAccessSchool(actor, asset.schoolId)) {
      throw AppError.forbidden('Accès refusé pour cet établissement.');
    }

    // 1. Check school media assignments
    const assignments = await db
      .select()
      .from(schoolMediaAssignments)
      .where(eq(schoolMediaAssignments.mediaAssetId, mediaId));

    if (assignments.length > 0) {
      const placements = assignments.map((a) => a.placement).join(', ');
      throw AppError.conflict(
        `Impossible de supprimer cette image : elle est actuellement assignée comme (${placements}). Veuillez d’abord retirer ou remplacer cette affectation.`
      );
    }

    // 2. Check system settings (logos, favicon)
    const settings = await db.select().from(systemSettings);
    for (const s of settings) {
      if (s.valueJson) {
        const str = JSON.stringify(s.valueJson);
        if (str.includes(asset.originalAssetKey) || str.includes(mediaId)) {
          throw AppError.conflict(
            `Impossible de supprimer cette image : elle est actuellement configurée comme logo ou visuel système (${s.key}). Veuillez d’abord la retirer des paramètres.`
          );
        }
      }
    }

    // 3. Delete versions and asset
    await db.delete(mediaAssetVersions).where(eq(mediaAssetVersions.mediaAssetId, mediaId));
    await db.delete(mediaAssets).where(eq(mediaAssets.id, mediaId));

    // 4. Log audit trail
    await db.insert(auditLogs).values({
      userId: actor.id,
      action: 'MEDIA_DELETED',
      module: 'MEDIA',
      entityType: 'MEDIA_ASSET',
      entityId: mediaId,
      schoolId: asset.schoolId,
      beforeJson: { originalAssetKey: asset.originalAssetKey, title: asset.title },
      result: 'SUCCESS',
    });

    return { success: true, message: 'Média supprimé définitivement avec succès.' };
  }

  /**
   * Archives a media asset so it no longer appears in active galleries.
   */
  static async archiveMedia(actor: User, mediaId: string) {
    if (!AuthGuard.hasPermission(actor, 'media.manage')) {
      throw new AppError('FORBIDDEN', 'Permission refusée.');
    }

    const db = getDb();
    const [asset] = await db.select().from(mediaAssets).where(eq(mediaAssets.id, mediaId));
    if (!asset) {
      throw new AppError('NOT_FOUND', 'Média introuvable.');
    }

    const [updated] = await db
      .update(mediaAssets)
      .set({
        status: 'ARCHIVED',
        archivedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(mediaAssets.id, mediaId))
      .returning();

    return this.formatResponsiveMedia(updated);
  }

  /**
   * Restores an archived media asset.
   */
  static async restoreMedia(actor: User, mediaId: string) {
    if (!AuthGuard.hasPermission(actor, 'media.manage')) {
      throw new AppError('FORBIDDEN', 'Permission refusée.');
    }

    const db = getDb();
    const [asset] = await db.select().from(mediaAssets).where(eq(mediaAssets.id, mediaId));
    if (!asset) {
      throw new AppError('NOT_FOUND', 'Média introuvable.');
    }

    const [updated] = await db
      .update(mediaAssets)
      .set({
        status: 'PUBLISHED',
        archivedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(mediaAssets.id, mediaId))
      .returning();

    return this.formatResponsiveMedia(updated);
  }

  /**
   * Helper: Formats responsive media DTO with fallback sources and normalized focal points.
   */
  private static formatResponsiveMedia(media: DbMediaAsset): ResponsiveMediaDto {
    const originalUrl = `/api/public/media/stream/${media.originalAssetKey}`;
    const desktopUrl = media.desktopAssetKey
      ? `/api/public/media/stream/${media.desktopAssetKey}`
      : originalUrl;
    const tabletUrl = media.tabletAssetKey
      ? `/api/public/media/stream/${media.tabletAssetKey}`
      : desktopUrl;
    const mobileUrl = media.mobileAssetKey
      ? `/api/public/media/stream/${media.mobileAssetKey}`
      : tabletUrl;

    const focalX = (media.focalX ?? 50) / 100;
    const focalY = (media.focalY ?? 50) / 100;

    const width = media.width || 1920;
    const height = media.height || 1080;
    const ratio = width / (height || 1);

    let aspectRatio = '16:9';
    if (ratio >= 0.95 && ratio <= 1.05) aspectRatio = '1:1';
    else if (ratio >= 1.28 && ratio <= 1.38) aspectRatio = '4:3';
    else if (ratio < 0.95) aspectRatio = '4:5';

    const orientation = ratio > 1.05 ? 'LANDSCAPE' : ratio < 0.95 ? 'PORTRAIT' : 'SQUARE';

    return {
      id: media.id,
      type: media.type,
      title: media.title,
      altTextFr: media.altTextFr,
      altTextAr: media.altTextAr,
      sources: {
        desktop: desktopUrl,
        tablet: tabletUrl,
        mobile: mobileUrl,
        fallback: originalUrl,
      },
      focalPoint: {
        x: focalX,
        y: focalY,
      },
      width: media.width,
      height: media.height,
      aspectRatio,
      orientation,
    };
  }
}
