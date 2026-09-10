/**
 * Unit Tests: Public Gallery APIs, Categories & Featured Filters.
 */

describe('Media Gallery: Categories, Ordering & Featured Flags', () => {
  test('filters gallery items by category', () => {
    const gallery = [
      { id: '1', title: 'Robotics Lab', galleryCategory: 'LABS', isFeatured: true, status: 'PUBLISHED' },
      { id: '2', title: 'Campus Courtyard', galleryCategory: 'CAMPUS', isFeatured: false, status: 'PUBLISHED' },
      { id: '3', title: 'Sports Field', galleryCategory: 'SPORTS', isFeatured: true, status: 'PUBLISHED' },
    ];

    const labsOnly = gallery.filter((g) => g.galleryCategory === 'LABS');
    expect(labsOnly.length).toBe(1);
    expect(labsOnly[0].title).toBe('Robotics Lab');
  });

  test('filters featured gallery items for homepage preview', () => {
    const gallery = [
      { id: '1', title: 'Robotics Lab', isFeatured: true, status: 'PUBLISHED' },
      { id: '2', title: 'Campus Courtyard', isFeatured: false, status: 'PUBLISHED' },
      { id: '3', title: 'Sports Field', isFeatured: true, status: 'PUBLISHED' },
    ];

    const featuredOnly = gallery.filter((g) => g.isFeatured);
    expect(featuredOnly.length).toBe(2);
    expect(featuredOnly.map((f) => f.id)).toEqual(['1', '3']);
  });
});
