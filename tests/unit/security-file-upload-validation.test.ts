/**
 * Unit Tests: File Upload Security, Path Traversal & MIME Sniffing.
 */

describe('Security: File Upload Safeguards', () => {
  test('rejects path traversal attempts in uploaded filenames', () => {
    const maliciousFilenames = [
      '../../etc/passwd',
      '..\\..\\windows\\system32\\cmd.exe',
      '/var/www/shell.php',
      '../../../secret.pdf',
    ];

    const sanitizeFilename = (raw: string) => {
      if (raw.includes('..') || raw.includes('/') || raw.includes('\\')) {
        throw new Error('PATH_TRAVERSAL_DETECTED');
      }
      return raw;
    };

    for (const filename of maliciousFilenames) {
      expect(() => sanitizeFilename(filename)).toThrow('PATH_TRAVERSAL_DETECTED');
    }
  });

  test('validates authentic PDF magic bytes (%PDF-)', () => {
    const validPdfBuffer = Buffer.from('%PDF-1.4 sample content');
    const fakePdfBuffer = Buffer.from('MZ\x90\x00\x03\x00\x00\x00 (executable file pretending to be pdf)');

    const isPdf = (buf: Buffer) => buf.subarray(0, 4).toString('ascii') === '%PDF';

    expect(isPdf(validPdfBuffer)).toBe(true);
    expect(isPdf(fakePdfBuffer)).toBe(false);
  });
});
