/**
 * PostgreSQL Sequence definitions for VISION SCHOOL.
 * Provides concurrency-safe generation for public registration dossier codes.
 */

import { pgSequence } from 'drizzle-orm/pg-core';

/**
 * Sequence for generating safe sequential registration reference numbers.
 * Generates numbers: 1, 2, 3, ... which are formatted into "REG-YYYY-NNNNNN".
 */
export const registrationCodeSeq = pgSequence('registration_code_seq', {
  startWith: 1,
  increment: 1,
  minValue: 1,
  maxValue: 999999999,
  cache: 1,
});

/**
 * Helper to format a sequence value into standard dossier code format.
 * E.g., generateRegistrationCode(2026, 125) => "REG-2026-000125"
 */
export function formatRegistrationCode(year: number | string, sequenceNumber: number): string {
  const paddedNumber = String(sequenceNumber).padStart(6, '0');
  const cleanYear = typeof year === 'string' ? year.split('/')[0].trim() : year;
  return `REG-${cleanYear}-${paddedNumber}`;
}
