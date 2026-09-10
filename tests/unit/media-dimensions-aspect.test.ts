/**
 * Unit Tests: Image Dimension Detection & Aspect Ratio Classifications.
 */

import { MediaService } from '../../apps/api/src/services/media.service';

describe('Media Dimensions: Aspect Ratio & Orientation Detection', () => {
  test('correctly classifies 16:9 widescreen landscape', () => {
    const analysis = MediaService.analyzeImageMetadata({
      buffer: Buffer.alloc(32),
      originalFilename: 'hero.jpg',
      mimeType: 'image/jpeg',
      width: 1920,
      height: 1080,
    });

    expect(analysis.aspectRatio).toBe('16:9');
    expect(analysis.orientation).toBe('LANDSCAPE');
  });

  test('correctly classifies 1:1 square image', () => {
    const analysis = MediaService.analyzeImageMetadata({
      buffer: Buffer.alloc(32),
      originalFilename: 'avatar.png',
      mimeType: 'image/png',
      width: 800,
      height: 800,
    });

    expect(analysis.aspectRatio).toBe('1:1');
    expect(analysis.orientation).toBe('SQUARE');
  });

  test('correctly classifies 4:5 portrait mobile image', () => {
    const analysis = MediaService.analyzeImageMetadata({
      buffer: Buffer.alloc(32),
      originalFilename: 'story.jpg',
      mimeType: 'image/jpeg',
      width: 1080,
      height: 1350,
    });

    expect(analysis.aspectRatio).toBe('4:5');
    expect(analysis.orientation).toBe('PORTRAIT');
  });

  test('emits suitability warning when hero image has low width resolution', () => {
    const analysis = MediaService.analyzeImageMetadata(
      {
        buffer: Buffer.alloc(32),
        originalFilename: 'small_hero.jpg',
        mimeType: 'image/jpeg',
        width: 800,
        height: 450,
      },
      'HERO'
    );

    expect(analysis.warnings.length).toBeGreaterThan(0);
    expect(analysis.warnings[0]).toContain('Résolution faible');
  });
});
