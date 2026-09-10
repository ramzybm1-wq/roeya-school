/**
 * Unit Tests: Secure Signed Temporary Access & Expiration.
 */

import { StorageService } from '../../apps/api/src/services/storage.service';

describe('Document Security: HMAC-SHA256 Signed Temporary URLs', () => {
  test('generates and successfully verifies signed temporary token within validity window', () => {
    const docId = 'doc_123';
    const storageKey = 'private/registrations/reg_1/documents/dt_birth/v1.pdf';

    const token = StorageService.createTemporarySignedToken(docId, storageKey, 'preview', 'birth.pdf', 900);
    expect(token).toBeDefined();

    const verification = StorageService.verifySignedToken(token);
    expect(verification.valid).toBe(true);
    expect(verification.payload?.documentId).toBe(docId);
    expect(verification.payload?.storageKey).toBe(storageKey);
    expect(verification.payload?.action).toBe('preview');
  });

  test('rejects tampered signature token', () => {
    const token = StorageService.createTemporarySignedToken('doc_1', 'key_1', 'preview', 'file.pdf', 900);
    const tampered = token.slice(0, -5) + 'XXXXX';

    const verification = StorageService.verifySignedToken(tampered);
    expect(verification.valid).toBe(false);
    expect(verification.error).toContain('invalide');
  });

  test('rejects expired temporary token', () => {
    // Generate token with negative validity (-10 seconds)
    const token = StorageService.createTemporarySignedToken('doc_1', 'key_1', 'preview', 'file.pdf', -10);

    const verification = StorageService.verifySignedToken(token);
    expect(verification.valid).toBe(false);
    expect(verification.error).toContain('expiré');
  });
});
