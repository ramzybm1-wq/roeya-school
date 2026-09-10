/**
 * Admin operations and pagination filters validator.
 */

import { ErrorDetail, RegistrationStatus } from '@vision-school/shared';
import { CommonValidator, ValidationResult } from './common.validator';

export interface AdminRegistrationFilterInput {
  page?: number;
  limit?: number;
  schoolId?: string;
  levelId?: string;
  academicYearId?: string;
  status?: RegistrationStatus;
  searchQuery?: string;
}

export interface AdminStatusUpdateInput {
  status: RegistrationStatus;
  adminNotes?: string;
  refusalReason?: string;
}

export class AdminValidator {
  static validateFilter(input: unknown): ValidationResult<AdminRegistrationFilterInput> {
    const errors: ErrorDetail[] = [];
    const data = (input || {}) as Partial<AdminRegistrationFilterInput>;

    const page = data.page !== undefined ? Number(data.page) : 1;
    const limit = data.limit !== undefined ? Number(data.limit) : 20;

    if (!CommonValidator.isPositiveInteger(page) || page < 1) {
      errors.push({ field: 'page', message: 'Numéro de page invalide (>= 1).' });
    }
    if (!CommonValidator.isPositiveInteger(limit) || limit < 1 || limit > 100) {
      errors.push({ field: 'limit', message: 'Limite par page invalide (1 - 100).' });
    }

    return {
      isValid: errors.length === 0,
      data: {
        page,
        limit,
        schoolId: data.schoolId,
        levelId: data.levelId,
        academicYearId: data.academicYearId,
        status: data.status,
        searchQuery: data.searchQuery,
      },
      errors,
    };
  }

  static validateStatusUpdate(input: unknown): ValidationResult<AdminStatusUpdateInput> {
    const errors: ErrorDetail[] = [];
    if (!input || typeof input !== 'object') {
      return { isValid: false, errors: [{ message: 'Invalid payload' }] };
    }

    const data = input as Partial<AdminStatusUpdateInput>;

    const validStatuses: RegistrationStatus[] = [
      'DRAFT',
      'SUBMITTED',
      'PENDING_REVIEW',
      'DOCUMENTS_REQUIRED',
      'WAITING_LIST',
      'ACCEPTED',
      'REFUSED',
      'CANCELLED',
    ];

    if (!data.status || !validStatuses.includes(data.status)) {
      errors.push({ field: 'status', message: 'Statut de dossier invalide.' });
    }

    if (data.status === 'REFUSED' && !CommonValidator.isNonEmptyString(data.refusalReason)) {
      errors.push({ field: 'refusalReason', message: 'Le motif de refus est requis lorsque le dossier est refusé.' });
    }

    return {
      isValid: errors.length === 0,
      data: errors.length === 0 ? (data as AdminStatusUpdateInput) : undefined,
      errors,
    };
  }
}
