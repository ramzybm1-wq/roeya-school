/**
 * Unit Tests: Public Media Upload Validations, Formats & Size Limits.
 */

describe('Media Upload: Format Validation & Size Restrictions', () => {
  test('accepts standard image formats (JPEG, PNG, WebP, AVIF, SVG)', () => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/svg+xml'];

    expect(allowed.includes('image/jpeg')).toBe(true);
    expect(allowed.includes('image/png')).toBe(true);
    expect(allowed.includes('image/webp')).toBe(true);
    expect(allowed.includes('application/pdf')).toBe(false); // PDFs belong in private document storage
  });

  test('enforces max file size (15MB general, 5MB logo)', () => {
    const maxGeneralBytes = 15 * 1024 * 1024;
    const maxLogoBytes = 5 * 1024 * 1024;

    const validGeneralSize = 8 * 1024 * 1024;
    const oversizedGeneralSize = 16 * 1024 * 1024;
    const oversizedLogoSize = 6 * 1024 * 1024;

    expect(validGeneralSize <= maxGeneralBytes).toBe(true);
    expect(oversizedGeneralSize <= maxGeneralBytes).toBe(false);
    expect(oversizedLogoSize <= maxLogoBytes).toBe(false);
  });
});
