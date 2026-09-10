/**
 * Tariff and fee configuration validator.
 */

import { ErrorDetail, FeeItem } from '@vision-school/shared';
import { CommonValidator, ValidationResult } from './common.validator';

export interface UpdateTariffInput {
  registrationFee: number;
  annualTuitionFee: number;
  trimestrialTuitionFee?: number;
  monthlyTuitionFee?: number;
  canteenFeeAnnual?: number;
  transportFeeAnnual?: number;
  discountSiblingPercent?: number;
  items?: FeeItem[];
  isPubliclyVisible?: boolean;
}

export class TariffValidator {
  static validate(input: unknown): ValidationResult<UpdateTariffInput> {
    const errors: ErrorDetail[] = [];
    if (!input || typeof input !== 'object') {
      return { isValid: false, errors: [{ message: 'Invalid payload' }] };
    }

    const data = input as Partial<UpdateTariffInput>;

    if (typeof data.registrationFee !== 'number' || data.registrationFee < 0) {
      errors.push({ field: 'registrationFee', message: "Les frais d'inscription doivent être un montant positif (>= 0 DZD)." });
    }
    if (typeof data.annualTuitionFee !== 'number' || data.annualTuitionFee < 0) {
      errors.push({ field: 'annualTuitionFee', message: 'La scolarité annuelle doit être un montant positif (>= 0 DZD).' });
    }

    if (data.discountSiblingPercent !== undefined) {
      if (typeof data.discountSiblingPercent !== 'number' || data.discountSiblingPercent < 0 || data.discountSiblingPercent > 100) {
        errors.push({ field: 'discountSiblingPercent', message: 'La remise fratrie doit être un pourcentage entre 0% et 100%.' });
      }
    }

    return {
      isValid: errors.length === 0,
      data: errors.length === 0 ? (data as UpdateTariffInput) : undefined,
      errors,
    };
  }
}
