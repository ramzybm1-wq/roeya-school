/**
 * Domain types for Public Media Assets and Gallery.
 * (Separate from private student documents).
 */

export type MediaType = 'IMAGE' | 'VIDEO' | 'BROCHURE_PDF';

export type MediaCategory =
  | 'CAMPUS'
  | 'CLASSROOM'
  | 'ACTIVITIES'
  | 'EVENTS'
  | 'FACILITIES'
  | 'HERO'
  | 'LOGO'
  | 'BANNER';

export interface ResponsiveMediaUrls {
  original: string;
  desktop?: string;
  tablet?: string;
  mobile?: string;
  thumbnail?: string;
}

export interface FocalPoint {
  x: number; // 0 to 100
  y: number; // 0 to 100
}

export interface MediaAsset {
  id: string;
  schoolId?: string; // Optional if global media
  titleFr: string;
  titleAr?: string;
  altTextFr: string;
  altTextAr?: string;
  category: MediaCategory;
  mediaType: MediaType;
  urls: ResponsiveMediaUrls;
  focalPoint?: FocalPoint;
  dimensions?: {
    width: number;
    height: number;
  };
  fileSizeBytes: number;
  mimeType: string;
  isPublished: boolean;
  order: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}
