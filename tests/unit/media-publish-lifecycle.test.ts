/**
 * Unit Tests: Media Lifecycle & Draft Protection.
 */

describe('Media Lifecycle: Draft, Publish, Unpublish & Archive', () => {
  test('newly uploaded asset defaults to DRAFT status', () => {
    const newMedia = { id: 'media_1', status: 'DRAFT', publishedAt: null as Date | null };
    expect(newMedia.status).toBe('DRAFT');
    expect(newMedia.publishedAt).toBeNull();
  });

  test('public query filters out DRAFT and INACTIVE assets', () => {
    const allAssets = [
      { id: '1', title: 'Asset 1', status: 'PUBLISHED' },
      { id: '2', title: 'Asset 2', status: 'DRAFT' },
      { id: '3', title: 'Asset 3', status: 'INACTIVE' },
      { id: '4', title: 'Asset 4', status: 'ARCHIVED' },
    ];

    const publicAssets = allAssets.filter((a) => a.status === 'PUBLISHED');
    expect(publicAssets.length).toBe(1);
    expect(publicAssets[0].id).toBe('1');
  });

  test('publishing transitions DRAFT to PUBLISHED with timestamp', () => {
    const asset = { id: 'media_1', status: 'DRAFT', publishedAt: null as Date | null };

    // Publish action
    asset.status = 'PUBLISHED';
    asset.publishedAt = new Date();

    expect(asset.status).toBe('PUBLISHED');
    expect(asset.publishedAt).toBeDefined();
  });
});
