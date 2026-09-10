/**
 * Unit Tests: Form Builder Resolution Hierarchy & Fallbacks.
 */

describe('Form Builder Resolution: School Specific vs Global Hierarchy', () => {
  test('resolves school-specific form over global form when published', () => {
    const forms = [
      { id: 'form_global_2026', schoolId: null, academicYearId: 'year_2026', status: 'PUBLISHED', version: 1 },
      { id: 'form_hydra_2026', schoolId: 'school_hydra', academicYearId: 'year_2026', status: 'PUBLISHED', version: 2 },
    ];

    const resolve = (schoolId?: string, yearId?: string) => {
      if (schoolId && yearId) {
        const match = forms.find((f) => f.schoolId === schoolId && f.academicYearId === yearId && f.status === 'PUBLISHED');
        if (match) return match.id;
      }
      const globalYear = forms.find((f) => f.schoolId === null && f.academicYearId === yearId && f.status === 'PUBLISHED');
      return globalYear ? globalYear.id : 'default_global';
    };

    expect(resolve('school_hydra', 'year_2026')).toBe('form_hydra_2026');
    expect(resolve('school_elbiar', 'year_2026')).toBe('form_global_2026'); // Falls back to global
  });
});
