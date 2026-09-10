/**
 * Unit Tests: Shared Validation Schemas.
 */

import { CommonValidator } from '@vision-school/validation';

describe('CommonValidator', () => {
  describe('isValidPhone', () => {
    test('accepts valid Algerian mobile numbers', () => {
      expect(CommonValidator.isValidPhone('0550123456')).toBe(true);
      expect(CommonValidator.isValidPhone('0661234567')).toBe(true);
      expect(CommonValidator.isValidPhone('0770123456')).toBe(true);
      expect(CommonValidator.isValidPhone('+213550123456')).toBe(true);
    });

    test('rejects invalid phone numbers', () => {
      expect(CommonValidator.isValidPhone('')).toBe(false);
      expect(CommonValidator.isValidPhone('123')).toBe(false);
      expect(CommonValidator.isValidPhone('abcdef')).toBe(false);
    });
  });

  describe('isValidEmail', () => {
    test('accepts valid email addresses', () => {
      expect(CommonValidator.isValidEmail('user@school.dz')).toBe(true);
      expect(CommonValidator.isValidEmail('admin@visionschool.dz')).toBe(true);
    });

    test('rejects invalid emails', () => {
      expect(CommonValidator.isValidEmail('')).toBe(false);
      expect(CommonValidator.isValidEmail('not-an-email')).toBe(false);
      expect(CommonValidator.isValidEmail('@missing.com')).toBe(false);
    });
  });

  describe('isValidDate', () => {
    test('accepts valid ISO dates', () => {
      expect(CommonValidator.isValidDate('2020-03-15')).toBe(true);
      expect(CommonValidator.isValidDate('2026-09-01')).toBe(true);
    });

    test('rejects invalid dates', () => {
      expect(CommonValidator.isValidDate('')).toBe(false);
      expect(CommonValidator.isValidDate('15/03/2020')).toBe(false);
      expect(CommonValidator.isValidDate('not-a-date')).toBe(false);
    });
  });

  describe('isValidRegistrationCode', () => {
    test('accepts valid REG codes', () => {
      expect(CommonValidator.isValidRegistrationCode('REG-2026-000125')).toBe(true);
    });

    test('rejects malformed codes', () => {
      expect(CommonValidator.isValidRegistrationCode('')).toBe(false);
      expect(CommonValidator.isValidRegistrationCode('ABC-2026-001')).toBe(false);
      expect(CommonValidator.isValidRegistrationCode('REG-2026-12')).toBe(false);
    });
  });
});
