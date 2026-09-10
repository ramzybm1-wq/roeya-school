/**
 * Unit Tests: Public Contact Form Submission & Whitelist.
 */

import { ALLOWED_CONTACT_SUBJECTS } from '../../apps/api/src/services/contact.service';

describe('Public Contact: Form Validation & Subject Whitelist', () => {
  test('accepts whitelisted contact subjects', () => {
    expect(ALLOWED_CONTACT_SUBJECTS).toContain('REGISTRATION');
    expect(ALLOWED_CONTACT_SUBJECTS).toContain('TARIFF');
    expect(ALLOWED_CONTACT_SUBJECTS).toContain('SCHOOL_VISIT');
  });

  test('rejects unwhitelisted arbitrary subjects', () => {
    const isAllowed = (subject: string) => ALLOWED_CONTACT_SUBJECTS.includes(subject as any);

    expect(isAllowed('INTERNAL_ADMIN_BYPASS')).toBe(false);
    expect(isAllowed('HACK_PAYLOAD')).toBe(false);
  });
});
