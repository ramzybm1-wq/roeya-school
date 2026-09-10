/**
 * Domain types for Multi-School Establishments.
 */

export interface SchoolCoordinates {
  latitude: number;
  longitude: number;
}

export interface SchoolContactInfo {
  phone: string;
  phoneSecondary?: string;
  whatsapp?: string;
  email: string;
  address: string;
  city: string;
  postalCode?: string;
  wilaya: string;
}

export interface SchoolSettings {
  isRegistrationOpen: boolean;
  allowWaitingList: boolean;
  publicVisible: boolean;
  googleMapsEmbedUrl?: string;
  googleMapsPlaceUrl?: string;
  primaryLanguage: 'fr' | 'ar';
}

export interface School {
  id: string;
  code: string; // e.g. "HYDRA-01", "ELBIAR-02"
  nameFr: string;
  nameAr: string;
  descriptionFr: string;
  descriptionAr: string;
  slug: string;
  logoUrl?: string;
  coverImageUrl?: string;
  contact: SchoolContactInfo;
  coordinates: SchoolCoordinates;
  settings: SchoolSettings;
  createdAt: string;
  updatedAt: string;
}

export type SchoolSummary = Pick<
  School,
  'id' | 'code' | 'nameFr' | 'nameAr' | 'slug' | 'logoUrl' | 'contact' | 'coordinates' | 'settings'
>;
