/**
 * Unit Tests: Multilingual Public Content & Fallbacks.
 */

describe('Public Content: French & Arabic Multilingual Fallbacks', () => {
  test('falls back to French content when Arabic translation is absent', () => {
    const item = {
      titleFr: 'Excellence Académique',
      titleAr: null,
    };

    const resolveTitle = (lang: 'fr' | 'ar') => {
      if (lang === 'ar' && item.titleAr) return item.titleAr;
      return item.titleFr;
    };

    expect(resolveTitle('fr')).toBe('Excellence Académique');
    expect(resolveTitle('ar')).toBe('Excellence Académique'); // Fallback to French
  });

  test('uses Arabic content when available', () => {
    const item = {
      titleFr: 'Excellence Académique',
      titleAr: 'التميز الأكاديمي',
    };

    const resolveTitle = (lang: 'fr' | 'ar') => {
      if (lang === 'ar' && item.titleAr) return item.titleAr;
      return item.titleFr;
    };

    expect(resolveTitle('ar')).toBe('التميز الأكاديمي');
  });
});
