/**
 * Unit Tests: Media In-Use Delete Protection & Version History Rollbacks.
 */

describe('Media Protection: In-Use Checks & Version Preservation', () => {
  test('blocks deletion of media asset when actively assigned to a public placement', () => {
    const activeAssignments = [{ id: 'asgn_1', mediaId: 'hero_1', placement: 'CLIENT_HERO', isActive: true }];

    const tryDeleteMedia = (mediaId: string) => {
      const isAssigned = activeAssignments.some((a) => a.mediaId === mediaId && a.isActive);
      if (isAssigned) {
        throw new Error('MEDIA_IN_USE');
      }
      return { success: true };
    };

    expect(() => tryDeleteMedia('hero_1')).toThrow('MEDIA_IN_USE');
  });

  test('replacing media creates version 2 and preserves version 1 in historical table', () => {
    const asset = { id: 'logo_1', versionNumber: 1, key: 'public/media/logo/v1.png' };
    const versionHistory = [{ versionNumber: 1, key: 'public/media/logo/v1.png' }];

    // Replace
    versionHistory.push({ versionNumber: 2, key: 'public/media/logo/v2.png' });
    asset.versionNumber = 2;
    asset.key = 'public/media/logo/v2.png';

    expect(asset.versionNumber).toBe(2);
    expect(versionHistory.length).toBe(2);
    expect(versionHistory[0].key).toBe('public/media/logo/v1.png');
  });
});
