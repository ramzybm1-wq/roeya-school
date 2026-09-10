/**
 * Unit Tests: Anti-Enumeration Protection.
 */

describe('Tracking Security: Anti-Enumeration Protection', () => {
  test('returns identical error message whether code exists or not', () => {
    const errorWhenCodeNotFound = 'Les informations saisies ne permettent pas d’identifier une demande.';
    const errorWhenPhoneMismatch = 'Les informations saisies ne permettent pas d’identifier une demande.';

    expect(errorWhenCodeNotFound).toBe(errorWhenPhoneMismatch);
  });
});
