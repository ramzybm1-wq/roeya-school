/**
 * Real Platform Settings & Branding Service for VISION / ROEYA SCHOOL.
 * Backed by the system_settings database table.
 */

import { getDb, systemSettings } from '@vision-school/database';
import { eq, and } from 'drizzle-orm';
import { AppError, User } from '@vision-school/shared';
import { AuthGuard } from '@vision-school/auth';
import { StorageService } from './storage.service';
import crypto from 'crypto';

export interface PublicBrandingSettings {
  siteName: string;
  platformName: string;
  shortName: string;
  brandShortName: string;
  tagline: string;
  clientLogoUrl: string;
  adminLogoUrl: string;
  faviconUrl: string;
  defaultAcademicYear: string;
  currency: string;
  allowPublicRegistration: boolean;
  contactEmail: string;
  contactPhone: string;
  contactAddress: string;
  contactWilaya?: string;
  contactCommune?: string;
  contactLatitude?: number | null;
  contactLongitude?: number | null;
  contactGoogleMapsUrl?: string;
  updatedAt?: string;
}

export class SettingsService {
  private static cachedPublicSettings: PublicBrandingSettings | null = null;
  private static cacheTimestamp = 0;
  private static readonly CACHE_TTL_MS = 30000;

  public static invalidateCache(): void {
    SettingsService.cachedPublicSettings = null;
    SettingsService.cacheTimestamp = 0;
  }

  /**
   * Helper: Get value of a setting key from system_settings table.
   */
  private static async getSettingValue(key: string, defaultValue: any = null): Promise<any> {
    try {
      const db = getDb();
      const [row] = await db
        .select()
        .from(systemSettings)
        .where(eq(systemSettings.key, key));
      
      if (!row || !row.valueJson) return defaultValue;
      const parsed = typeof row.valueJson === 'object' ? (row.valueJson as any) : JSON.parse(row.valueJson as string);
      return parsed.value !== undefined ? parsed.value : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  /**
   * Helper: Upsert setting value into system_settings table.
   */
  private static async upsertSetting(key: string, value: any, isPublic = true, scope = 'GLOBAL'): Promise<void> {
    const db = getDb();
    const existing = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.key, key));

    if (existing.length > 0) {
      await db
        .update(systemSettings)
        .set({
          valueJson: { value },
          isPublic,
          updatedAt: new Date(),
        })
        .where(eq(systemSettings.key, key));
    } else {
      await db
        .insert(systemSettings)
        .values({
          scope,
          key,
          valueJson: { value },
          isPublic,
        });
    }
    SettingsService.invalidateCache();
  }

  /**
   * Get public platform branding settings.
   */
  async getPublicSettings(): Promise<PublicBrandingSettings> {
    if (SettingsService.cachedPublicSettings && (Date.now() - SettingsService.cacheTimestamp < SettingsService.CACHE_TTL_MS)) {
      return SettingsService.cachedPublicSettings;
    }

    const platformName = (await SettingsService.getSettingValue('platform.name', 'ROEYA SCHOOL')) || 'ROEYA SCHOOL';
    const shortName = (await SettingsService.getSettingValue('platform.short_name', 'ROEYA')) || 'ROEYA';
    const tagline = (await SettingsService.getSettingValue('platform.tagline', 'Excellence & Innovation Pédagogique')) || '';
    const clientLogoUrl = (await SettingsService.getSettingValue('branding.client_logo_url', '')) || '';
    const adminLogoUrl = (await SettingsService.getSettingValue('branding.admin_logo_url', '')) || '';
    const faviconUrl = (await SettingsService.getSettingValue('branding.favicon_url', '')) || '';
    const defaultAcademicYear = (await SettingsService.getSettingValue('platform.default_academic_year', '2026/2027')) || '2026/2027';
    const currency = (await SettingsService.getSettingValue('platform.default_currency', 'DZD')) || 'DZD';
    const allowPublicRegistration = (await SettingsService.getSettingValue('registration.allow_public_submission', true)) ?? true;
    const contactEmail = (await SettingsService.getSettingValue('contact.email', 'contact@roeyaschool.dz')) || 'contact@roeyaschool.dz';
    const contactPhone = (await SettingsService.getSettingValue('contact.phone', '+213 21 00 00 00')) || '+213 21 00 00 00';
    const contactAddress = (await SettingsService.getSettingValue('contact.address', 'Hydra, Alger, Algérie')) || 'Hydra, Alger, Algérie';
    const contactWilaya = (await SettingsService.getSettingValue('contact.wilaya', '')) || '';
    const contactCommune = (await SettingsService.getSettingValue('contact.commune', '')) || '';
    const contactLatitude = await SettingsService.getSettingValue('contact.latitude', null);
    const contactLongitude = await SettingsService.getSettingValue('contact.longitude', null);
    const contactGoogleMapsUrl = (await SettingsService.getSettingValue('contact.google_maps_url', '')) || '';
    const updatedAt = (await SettingsService.getSettingValue('branding.updated_at', '')) || String(Date.now());

    const result: PublicBrandingSettings = {
      siteName: platformName,
      platformName,
      shortName,
      brandShortName: shortName,
      tagline,
      clientLogoUrl,
      adminLogoUrl,
      faviconUrl,
      defaultAcademicYear,
      currency,
      allowPublicRegistration,
      contactEmail,
      contactPhone,
      contactAddress,
      contactWilaya,
      contactCommune,
      contactLatitude: contactLatitude !== null && contactLatitude !== undefined && contactLatitude !== '' ? Number(contactLatitude) : null,
      contactLongitude: contactLongitude !== null && contactLongitude !== undefined && contactLongitude !== '' ? Number(contactLongitude) : null,
      contactGoogleMapsUrl,
      updatedAt,
    };

    SettingsService.cachedPublicSettings = result;
    SettingsService.cacheTimestamp = Date.now();
    return result;
  }

  /**
   * Update branding settings (admin only).
   */
  async updateBrandingSettings(
    actor: User,
    payload: {
      siteName?: string;
      platformName?: string;
      shortName?: string;
      brandShortName?: string;
      tagline?: string;
      clientLogoUrl?: string;
      adminLogoUrl?: string;
      faviconUrl?: string;
      contactEmail?: string;
      contactPhone?: string;
      contactAddress?: string;
      contactWilaya?: string;
      contactCommune?: string;
      contactLatitude?: number | null;
      contactLongitude?: number | null;
      contactGoogleMapsUrl?: string;
    }
  ): Promise<PublicBrandingSettings> {
    if (actor.role !== 'SUPER_ADMIN' && actor.role !== 'ADMIN') {
      throw AppError.forbidden('Seul un administrateur peut modifier l’identité visuelle.');
    }

    const platformNameVal = payload.platformName !== undefined ? payload.platformName : payload.siteName;
    if (platformNameVal !== undefined) {
      const name = platformNameVal.trim();
      if (!name) throw AppError.badRequest('Le nom de l’établissement est requis.');
      await SettingsService.upsertSetting('platform.name', name, true);
    }

    const shortNameVal = payload.shortName !== undefined ? payload.shortName : payload.brandShortName;
    if (shortNameVal !== undefined) {
      await SettingsService.upsertSetting('platform.short_name', shortNameVal.trim(), true);
    }

    if (payload.tagline !== undefined) {
      await SettingsService.upsertSetting('platform.tagline', payload.tagline.trim(), true);
    }

    if (payload.clientLogoUrl !== undefined) {
      await SettingsService.upsertSetting('branding.client_logo_url', payload.clientLogoUrl.trim(), true);
    }

    if (payload.adminLogoUrl !== undefined) {
      await SettingsService.upsertSetting('branding.admin_logo_url', payload.adminLogoUrl.trim(), true);
    }

    if (payload.faviconUrl !== undefined) {
      await SettingsService.upsertSetting('branding.favicon_url', payload.faviconUrl.trim(), true);
    }

    if (payload.contactEmail !== undefined) {
      await SettingsService.upsertSetting('contact.email', payload.contactEmail.trim(), true);
    }

    if (payload.contactPhone !== undefined) {
      await SettingsService.upsertSetting('contact.phone', payload.contactPhone.trim(), true);
    }

    if (payload.contactAddress !== undefined) {
      await SettingsService.upsertSetting('contact.address', payload.contactAddress.trim(), true);
    }

    if (payload.contactWilaya !== undefined) {
      await SettingsService.upsertSetting('contact.wilaya', payload.contactWilaya.trim(), true);
    }

    if (payload.contactCommune !== undefined) {
      await SettingsService.upsertSetting('contact.commune', payload.contactCommune.trim(), true);
    }

    if (payload.contactLatitude !== undefined) {
      const lat = payload.contactLatitude !== null && !isNaN(Number(payload.contactLatitude)) ? Number(payload.contactLatitude) : null;
      if (lat !== null && (lat < -90 || lat > 90)) {
        throw AppError.badRequest('La latitude doit être comprise entre -90 et 90 degrés.');
      }
      await SettingsService.upsertSetting('contact.latitude', lat, true);
    }

    if (payload.contactLongitude !== undefined) {
      const lng = payload.contactLongitude !== null && !isNaN(Number(payload.contactLongitude)) ? Number(payload.contactLongitude) : null;
      if (lng !== null && (lng < -180 || lng > 180)) {
        throw AppError.badRequest('La longitude doit être comprise entre -180 et 180 degrés.');
      }
      await SettingsService.upsertSetting('contact.longitude', lng, true);
    }

    if (payload.contactGoogleMapsUrl !== undefined) {
      const mapsUrl = payload.contactGoogleMapsUrl.trim();
      if (mapsUrl && !mapsUrl.startsWith('https://') && !mapsUrl.startsWith('http://')) {
        throw AppError.badRequest('L’URL Google Maps doit commencer par https://');
      }
      await SettingsService.upsertSetting('contact.google_maps_url', mapsUrl, true);
    }

    await SettingsService.upsertSetting('branding.updated_at', new Date().toISOString(), true);

    SettingsService.invalidateCache();
    return this.getPublicSettings();
  }

  /**
   * Upload logo (client or admin) and update branding settings.
   */
  async uploadLogo(
    actor: User,
    target: 'client' | 'admin' | 'favicon',
    file: { buffer: Buffer; mimeType: string; originalFilename: string }
  ): Promise<{ logoUrl: string; settings: PublicBrandingSettings }> {
    if (actor.role !== 'SUPER_ADMIN' && actor.role !== 'ADMIN') {
      throw AppError.forbidden('Seul un administrateur peut téléverser un logo.');
    }

    const allowedMime = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon'];
    if (!allowedMime.includes(file.mimeType.toLowerCase())) {
      throw AppError.badRequest('Format d’image non supporté (JPEG, PNG, WebP, SVG, ICO).');
    }

    const ext = file.originalFilename.split('.').pop() || (file.mimeType.includes('svg') ? 'svg' : 'png');
    const filename = `branding_${target}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.${ext}`;
    const storageKey = `branding/${filename}`;

    const uploaded = await StorageService.uploadPublicMedia(storageKey, file.buffer, file.mimeType);

    const key = target === 'client' 
      ? 'branding.client_logo_url' 
      : target === 'admin' 
      ? 'branding.admin_logo_url' 
      : 'branding.favicon_url';

    await SettingsService.upsertSetting(key, uploaded.publicUrl, true);
    await SettingsService.upsertSetting('branding.updated_at', new Date().toISOString(), true);
    const updated = await this.getPublicSettings();

    return {
      logoUrl: uploaded.publicUrl,
      settings: updated,
    };
  }

  /**
   * Remove logo.
   */
  async removeLogo(
    actor: User,
    target: 'client' | 'admin' | 'favicon'
  ): Promise<PublicBrandingSettings> {
    if (actor.role !== 'SUPER_ADMIN' && actor.role !== 'ADMIN') {
      throw AppError.forbidden('Seul un administrateur peut retirer un logo.');
    }

    const key = target === 'client' 
      ? 'branding.client_logo_url' 
      : target === 'admin' 
      ? 'branding.admin_logo_url' 
      : 'branding.favicon_url';

    await SettingsService.upsertSetting(key, '', true);
    await SettingsService.upsertSetting('branding.updated_at', new Date().toISOString(), true);
    return this.getPublicSettings();
  }
}
