/**
 * Document upload and validation metadata validator.
 */

import { ErrorDetail, RequiredDocumentType } from '@vision-school/shared';
import { APP_CONFIG } from '@vision-school/config';
import { CommonValidator, ValidationResult } from './common.validator';

export interface DocumentUploadMetadata {
  documentTypeCode: RequiredDocumentType;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
}

export class DocumentValidator {
  static validateUploadMetadata(input: unknown): ValidationResult<DocumentUploadMetadata> {
    const errors: ErrorDetail[] = [];
    if (!input || typeof input !== 'object') {
      return { isValid: false, errors: [{ message: 'Invalid document payload' }] };
    }

    const data = input as Partial<DocumentUploadMetadata>;

    const validTypes: RequiredDocumentType[] = [
      'BIRTH_CERTIFICATE',
      'SCHOOL_CERTIFICATE',
      'REPORT_CARD',
      'VACCINATION_RECORD',
      'PARENT_ID',
      'PHOTO_IDENTITY',
      'OTHER',
    ];

    if (!data.documentTypeCode || !validTypes.includes(data.documentTypeCode)) {
      errors.push({ field: 'documentTypeCode', message: 'Type de document invalide.' });
    }

    if (!CommonValidator.isNonEmptyString(data.fileName)) {
      errors.push({ field: 'fileName', message: 'Le nom de fichier est requis.' });
    }

    if (typeof data.fileSizeBytes !== 'number' || data.fileSizeBytes <= 0) {
      errors.push({ field: 'fileSizeBytes', message: 'Taille de fichier invalide.' });
    } else if (data.fileSizeBytes > APP_CONFIG.uploads.maxDocumentSizeBytes) {
      errors.push({
        field: 'fileSizeBytes',
        message: `Le fichier dépasse la taille maximale autorisée (${APP_CONFIG.uploads.maxDocumentSizeBytes / (1024 * 1024)} Mo).`,
      });
    }

    if (!data.mimeType || !APP_CONFIG.uploads.allowedDocumentMimeTypes.includes(data.mimeType)) {
      errors.push({
        field: 'mimeType',
        message: `Format de fichier non autorisé. Formats acceptés : PDF, JPEG, PNG, WEBP.`,
      });
    }

    return {
      isValid: errors.length === 0,
      data: errors.length === 0 ? (data as DocumentUploadMetadata) : undefined,
      errors,
    };
  }
}
