/**
 * Domain types for System Settings and Configuration.
 */

export interface SystemSetting {
  key: string;
  value: string;
  type: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'JSON';
  isPublic: boolean;
  category: 'GENERAL' | 'REGISTRATION' | 'SECURITY' | 'INTEGRATION' | 'NOTIFICATIONS';
  descriptionFr?: string;
  descriptionAr?: string;
  updatedAt: string;
  updatedByUserId?: string;
}

export interface PublicPlatformSettings {
  activeAcademicYearCode: string;
  defaultLanguage: 'fr' | 'ar';
  supportedLanguages: string[];
  contactEmail: string;
  contactPhone: string;
  platformName: string;
  allowPublicRegistration: boolean;
  googleMapsEnabled: boolean;
}
