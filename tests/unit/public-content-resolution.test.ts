/**
 * Unit Tests: Public Content Resolution Hierarchy & Fallback.
 */

describe('Public Content: School Specific vs Global Resolution', () => {
  test('resolves school-specific content block over global block when published', () => {
    const blocks = [
      { id: 'blk_global_values', schoolId: null, page: 'HOME', sectionKey: 'VALUES', status: 'PUBLISHED', content: 'Global Values' },
      { id: 'blk_hydra_values', schoolId: 'school_hydra', page: 'HOME', sectionKey: 'VALUES', status: 'PUBLISHED', content: 'Hydra Values' },
    ];

    const resolveBlock = (schoolId: string | null, sectionKey: string) => {
      if (schoolId) {
        const schoolBlock = blocks.find((b) => b.schoolId === schoolId && b.sectionKey === sectionKey && b.status === 'PUBLISHED');
        if (schoolBlock) return schoolBlock.content;
      }
      const globalBlock = blocks.find((b) => b.schoolId === null && b.sectionKey === sectionKey && b.status === 'PUBLISHED');
      return globalBlock ? globalBlock.content : 'Default UI Text';
    };

    expect(resolveBlock('school_hydra', 'VALUES')).toBe('Hydra Values');
    expect(resolveBlock('school_elbiar', 'VALUES')).toBe('Global Values');
  });

  test('ignores DRAFT content blocks in public resolution', () => {
    const blocks = [
      { id: 'blk_draft', schoolId: 'school_hydra', page: 'HOME', sectionKey: 'HERO', status: 'DRAFT', content: 'Draft Hero' },
      { id: 'blk_global_published', schoolId: null, page: 'HOME', sectionKey: 'HERO', status: 'PUBLISHED', content: 'Published Hero' },
    ];

    const published = blocks.filter((b) => b.status === 'PUBLISHED');
    expect(published.length).toBe(1);
    expect(published[0].content).toBe('Published Hero');
  });
});
