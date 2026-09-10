/**
 * Domain types for Student Documents (Private) and Document Configuration.
 */

export type DocumentValidationStatus = 'PENDING' | 'VALIDATED' | 'REJECTED' | 'RE_UPLOAD_REQUESTED';

export type RequiredDocumentType =
  | 'BIRTH_CERTIFICATE'
  | 'SCHOOL_CERTIFICATE'
  | 'REPORT_CARD'
  | 'VACCINATION_RECORD'
  | 'PARENT_ID'
  | 'PHOTO_IDENTITY'
  | 'OTHER';

export interface DocumentTypeConfig {
  id: string;
  code: RequiredDocumentType;
  nameFr: string;
  nameAr: string;
  descriptionFr?: string;
  descriptionAr?: string;
  isMandatory: boolean;
  allowedExtensions: string[]; // e.g. [".pdf", ".jpg", ".png"]
  maxSizeInBytes: number; // e.g. 5242880 (5MB)
  applicableCycleCodes: string[];
}

export interface RegistrationDocument {
  id: string;
  registrationId: string;
  documentTypeCode: RequiredDocumentType;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
  storageKey: string; // Secure private storage path (NEVER public URL)
  validationStatus: DocumentValidationStatus;
  rejectionReason?: string;
  verifiedByUserId?: string;
  verifiedAt?: string;
  uploadedAt: string;
}
