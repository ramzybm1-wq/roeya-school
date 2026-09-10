/**
 * Public registration dossier tracking validator.
 */

import { ErrorDetail } from '@vision-school/shared';
import { CommonValidator, ValidationResult } from './common.validator';

export interface TrackingQueryInput {
  code: string;
  birthDate?: string;
  token?: string;
}

export class TrackingValidator {
  static validate(input: unknown): ValidationResult<TrackingQueryInput> {
    const errors: ErrorDetail[] = [];
    if (!input || typeof input !== 'object') {
      return { isValid: false, errors: [{ message: 'Invalid tracking payload' }] };
    }

    const data = input as Partial<TrackingQueryInput>;

    if (!CommonValidator.isValidRegistrationCode(data.code || '')) {
      errors.push({
        field: 'code',
        message: 'Code de dossier invalide (Exemple attendu : REG-2026-000125).',
      });
    }

    if (data.birthDate && !CommonValidator.isValidDate(data.birthDate)) {
      errors.push({
        field: 'birthDate',
        message: 'Date de naissance invalide (Format: YYYY-MM-DD).',
      });
    }

    return {
      isValid: errors.length === 0,
      data: errors.length === 0 ? (data as TrackingQueryInput) : undefined,
      errors,
    };
  }
}
