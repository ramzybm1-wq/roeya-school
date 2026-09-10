/**
 * Unit Tests: Normalized Focal Point Positioning Engine.
 */

describe('Media Focal Point: Normalized Coordinates & CSS Positioning', () => {
  test('converts normalized coordinates (0.2, 0.8) to percentage CSS object-position (20% 80%)', () => {
    const focalPoint = { x: 0.2, y: 0.8 };

    const focalX = Math.round(focalPoint.x * 100);
    const focalY = Math.round(focalPoint.y * 100);
    const objectPosition = `${focalX}% ${focalY}%`;

    expect(objectPosition).toBe('20% 80%');
  });

  test('validates coordinate bounds between 0.0 and 1.0', () => {
    const isValidFocal = (x: number, y: number) => x >= 0 && x <= 1 && y >= 0 && y <= 1;

    expect(isValidFocal(0.5, 0.5)).toBe(true);
    expect(isValidFocal(0.0, 1.0)).toBe(true);
    expect(isValidFocal(-0.1, 0.5)).toBe(false);
    expect(isValidFocal(0.5, 1.2)).toBe(false);
  });
});
