/**
 * Common validation primitives and helpers.
 */

import { ErrorDetail } from '@vision-school/shared';

export interface ValidationResult<T> {
  isValid: boolean;
  data?: T;
  errors: ErrorDetail[];
}

export class CommonValidator {
  /**
   * Validates Algerian and international phone numbers.
   * Algerian format: 05/06/07 followed by 8 digits, or +213 followed by 9 digits.
   */
  static isValidPhone(phone: string): boolean {
    if (!phone || typeof phone !== 'string') return false;
    const cleaned = phone.replace(/[\s.-]/g, '');
    const algerianPattern = /^(0|\+213|00213)(5|6|7)[0-9]{8}$/;
    const internationalPattern = /^\+?[1-9]\d{7,14}$/;
    return algerianPattern.test(cleaned) || internationalPattern.test(cleaned);
  }

  static isValidEmail(email: string): boolean {
    if (!email || typeof email !== 'string') return false;
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailPattern.test(email.trim());
  }

  static isValidDate(dateStr: string): boolean {
    if (!dateStr || typeof dateStr !== 'string') return false;
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateStr)) return false;
    const date = new Date(dateStr);
    return !isNaN(date.getTime());
  }

  static isAgeInRange(birthDateStr: string, minAge: number, maxAge: number): boolean {
    if (!this.isValidDate(birthDateStr)) return false;
    const birthDate = new Date(birthDateStr);
    const now = new Date();
    let age = now.getFullYear() - birthDate.getFullYear();
    const m = now.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birthDate.getDate())) {
      age--;
    }
    return age >= minAge && age <= maxAge;
  }

  static isValidRegistrationCode(code: string): boolean {
    if (!code || typeof code !== 'string') return false;
    // Format: REG-YYYY-XXXXXX (e.g., REG-2026-000125)
    return /^REG-\d{4}-\d{6}$/.test(code.trim().toUpperCase());
  }

  static isNonEmptyString(val: unknown, minLength = 1, maxLength = 255): boolean {
    return typeof val === 'string' && val.trim().length >= minLength && val.trim().length <= maxLength;
  }

  static isPositiveInteger(val: unknown): boolean {
    return typeof val === 'number' && Number.isInteger(val) && val >= 0;
  }
}
