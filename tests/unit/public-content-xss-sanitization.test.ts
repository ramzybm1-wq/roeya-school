/**
 * Unit Tests: Public Content & Contact Input Sanitization / XSS Prevention.
 */

import { ContactService } from '../../apps/api/src/services/contact.service';

describe('Public Content Security: Input Sanitization', () => {
  test('escapes HTML tags and script elements in public contact submissions', () => {
    const maliciousPayload = '<script>alert("XSS")</script>Bonjour';
    const sanitized = ContactService.sanitizeText(maliciousPayload);

    expect(sanitized).not.toContain('<script>');
    expect(sanitized).not.toContain('</script>');
    expect(sanitized).toContain('&lt;script&gt;');
  });
});
