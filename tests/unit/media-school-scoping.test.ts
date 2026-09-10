/**
 * Unit Tests: Multi-School Media Scoping & Placement Hierarchy.
 */

describe('Media Scoping: School Specific vs Global Hierarchy', () => {
  test('resolves school-specific hero when available over global fallback', () => {
    const assignments = [
      { id: '1', schoolId: 'school_hydra', placement: 'CLIENT_HERO', mediaId: 'hero_hydra' },
      { id: '2', schoolId: null, placement: 'CLIENT_HERO', mediaId: 'hero_global' },
    ];

    const resolveHero = (targetSchoolId?: string) => {
      if (targetSchoolId) {
        const schoolSpecific = assignments.find(
          (a) => a.schoolId === targetSchoolId && a.placement === 'CLIENT_HERO'
        );
        if (schoolSpecific) return schoolSpecific.mediaId;
      }
      const global = assignments.find((a) => a.schoolId === null && a.placement === 'CLIENT_HERO');
      return global ? global.mediaId : 'neutral_fallback';
    };

    expect(resolveHero('school_hydra')).toBe('hero_hydra');
    expect(resolveHero('school_elbiar')).toBe('hero_global'); // Falls back to global
    expect(resolveHero()).toBe('hero_global');
  });
});
