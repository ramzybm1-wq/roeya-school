/**
 * Unit Tests: Responsive Variant Resolution & Centralized Fallbacks.
 */

describe('Media Responsive Variants: Multi-Device Fallback Logic', () => {
  test('falls back gracefully to original when dedicated tablet and mobile variants are missing', () => {
    const media = {
      originalKey: 'public/media/hero/original.jpg',
      desktopKey: null as string | null,
      tabletKey: null as string | null,
      mobileKey: null as string | null,
    };

    const originalUrl = `/api/public/media/stream/${media.originalKey}`;
    const desktopUrl = media.desktopKey ? `/api/public/media/stream/${media.desktopKey}` : originalUrl;
    const tabletUrl = media.tabletKey ? `/api/public/media/stream/${media.tabletKey}` : desktopUrl;
    const mobileUrl = media.mobileKey ? `/api/public/media/stream/${media.mobileKey}` : tabletUrl;

    expect(desktopUrl).toBe('/api/public/media/stream/public/media/hero/original.jpg');
    expect(tabletUrl).toBe('/api/public/media/stream/public/media/hero/original.jpg');
    expect(mobileUrl).toBe('/api/public/media/stream/public/media/hero/original.jpg');
  });

  test('uses dedicated mobile variant when uploaded', () => {
    const media = {
      originalKey: 'public/media/hero/original.jpg',
      desktopKey: 'public/media/hero/desktop.jpg',
      tabletKey: null as string | null,
      mobileKey: 'public/media/hero/mobile.jpg',
    };

    const originalUrl = `/api/public/media/stream/${media.originalKey}`;
    const desktopUrl = media.desktopKey ? `/api/public/media/stream/${media.desktopKey}` : originalUrl;
    const tabletUrl = media.tabletKey ? `/api/public/media/stream/${media.tabletKey}` : desktopUrl;
    const mobileUrl = media.mobileKey ? `/api/public/media/stream/${media.mobileKey}` : tabletUrl;

    expect(desktopUrl).toBe('/api/public/media/stream/public/media/hero/desktop.jpg');
    expect(tabletUrl).toBe('/api/public/media/stream/public/media/hero/desktop.jpg'); // Falls back to desktop
    expect(mobileUrl).toBe('/api/public/media/stream/public/media/hero/mobile.jpg'); // Uses mobile variant
  });
});
