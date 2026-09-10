/**
 * Level and Capacity configuration validator.
 */

import { ErrorDetail } from '@vision-school/shared';
import { CommonValidator, ValidationResult } from './common.validator';

export interface UpdateCapacityInput {
  totalSeats: number;
  reservedSeats?: number;
  nearCapacityThresholdPercent?: number;
  isLocked?: boolean;
}

export class LevelCapacityValidator {
  static validateCapacityUpdate(input: unknown): ValidationResult<UpdateCapacityInput> {
    const errors: ErrorDetail[] = [];
    if (!input || typeof input !== 'object') {
      return { isValid: false, errors: [{ message: 'Invalid payload' }] };
    }

    const data = input as Partial<UpdateCapacityInput>;

    if (!CommonValidator.isPositiveInteger(data.totalSeats) || (data.totalSeats !== undefined && data.totalSeats < 1)) {
      errors.push({ field: 'totalSeats', message: 'Le nombre total de places doit être un entier positif (>= 1).' });
    }

    if (data.reservedSeats !== undefined) {
      if (!CommonValidator.isPositiveInteger(data.reservedSeats)) {
        errors.push({ field: 'reservedSeats', message: 'Les places réservées doivent être un entier positif (>= 0).' });
      }
      if (data.totalSeats !== undefined && data.reservedSeats > data.totalSeats) {
        errors.push({
          field: 'reservedSeats',
          message: 'Les places réservées ne peuvent pas dépasser la capacité totale.',
        });
      }
    }

    if (data.nearCapacityThresholdPercent !== undefined) {
      if (
        typeof data.nearCapacityThresholdPercent !== 'number' ||
        data.nearCapacityThresholdPercent < 1 ||
        data.nearCapacityThresholdPercent > 100
      ) {
        errors.push({
          field: 'nearCapacityThresholdPercent',
          message: "Le seuil d'alerte de capacité doit être un pourcentage entre 1% et 100%.",
        });
      }
    }

    return {
      isValid: errors.length === 0,
      data: errors.length === 0 ? (data as UpdateCapacityInput) : undefined,
      errors,
    };
  }
}
