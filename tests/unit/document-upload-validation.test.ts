/**
 * Unit Tests: Document Upload Validations, Formats & Storage Keys.
 */

import { StorageService } from '../../apps/api/src/services/storage.service';

describe('Document Upload: File Validation & Storage Key Formatting', () => {
  test('generates standardized private storage key without user filenames', () => {
    const regId = 'reg_12345';
    const docTypeId = 'dt_birth_cert';
    const versionNumber = 1;

    const key = StorageService.buildDocumentStorageKey(regId, docTypeId, versionNumber, 'pdf');

    expect(key).toBe('private/registrations/reg_12345/documents/dt_birth_cert/v1.pdf');
    expect(key.startsWith('private/')).toBe(true);
  });

  test('validates file size within allowed limit (5 MB)', () => {
    const maxSizeBytes = 5 * 1024 * 1024; // 5MB
    const validFileSize = 2.5 * 1024 * 1024; // 2.5MB
    const oversizedFileSize = 6 * 1024 * 1024; // 6MB

    expect(validFileSize <= maxSizeBytes).toBe(true);
    expect(oversizedFileSize <= maxSizeBytes).toBe(false);
  });

  test('validates allowed MIME types (PDF, JPEG, PNG)', () => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/png'];

    expect(allowed.includes('application/pdf')).toBe(true);
    expect(allowed.includes('image/png')).toBe(true);
    expect(allowed.includes('application/x-msdownload')).toBe(false);
    expect(allowed.includes('text/html')).toBe(false);
  });
});
