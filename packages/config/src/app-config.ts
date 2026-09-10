/**
 * Central Typed Application Configuration.
 */

export interface UploadLimitConfig {
  maxDocumentSizeBytes: number; // e.g. 5MB
  maxMediaImageSizeBytes: number; // e.g. 10MB
  maxMediaVideoSizeBytes: number; // e.g. 100MB
  allowedDocumentMimeTypes: string[];
  allowedImageMimeTypes: string[];
}

export interface PaginationConfig {
  defaultLimit: number;
  maxLimit: number;
}

export interface PlatformConfig {
  appName: string;
  defaultTimezone: string;
  defaultCurrency: string;
  defaultLocale: 'fr' | 'ar';
  supportedLocales: readonly ['fr', 'ar'];
  activeAcademicYearCode: string;
  registrationCodePrefix: string;
  nearCapacityDefaultThresholdPercent: number;
  pagination: PaginationConfig;
  uploads: UploadLimitConfig;
  features: {
    enablePublicRegistration: boolean;
    enableWaitingList: boolean;
    enableArabicLanguage: boolean;
    enableGoogleMapsPreview: boolean;
    requireTwoFactorForSuperAdmin: boolean;
  };
}

export const APP_CONFIG: PlatformConfig = {
  appName: 'VISION SCHOOL',
  defaultTimezone: 'Africa/Algiers',
  defaultCurrency: 'DZD',
  defaultLocale: 'fr',
  supportedLocales: ['fr', 'ar'] as const,
  activeAcademicYearCode: '2026/2027',
  registrationCodePrefix: 'REG',
  nearCapacityDefaultThresholdPercent: 85,
  pagination: {
    defaultLimit: 20,
    maxLimit: 100,
  },
  uploads: {
    maxDocumentSizeBytes: 5 * 1024 * 1024, // 5MB
    maxMediaImageSizeBytes: 10 * 1024 * 1024, // 10MB
    maxMediaVideoSizeBytes: 100 * 1024 * 1024, // 100MB
    allowedDocumentMimeTypes: [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
    ],
    allowedImageMimeTypes: [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/svg+xml',
    ],
  },
  features: {
    enablePublicRegistration: true,
    enableWaitingList: true,
    enableArabicLanguage: true,
    enableGoogleMapsPreview: true,
    requireTwoFactorForSuperAdmin: true,
  },
};
