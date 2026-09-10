/**
 * Unit Tests: Academic Year Comparative Analytics & Safe Variations.
 */

describe('Reports: Academic Year Comparative Analytics', () => {
  test('calculates variation and handles divide-by-zero safely', () => {
    const calculateVariation = (curr: number, prev: number) => {
      const diff = curr - prev;
      const percent = prev === 0 ? (curr > 0 ? 100 : 0) : Math.round(((curr - prev) / prev) * 100);
      return { diff, percent };
    };

    // Normal growth
    expect(calculateVariation(120, 100)).toEqual({ diff: 20, percent: 20 });

    // Decrease
    expect(calculateVariation(80, 100)).toEqual({ diff: -20, percent: -20 });

    // Safe divide by zero (prev = 0)
    expect(calculateVariation(50, 0)).toEqual({ diff: 50, percent: 100 });
    expect(calculateVariation(0, 0)).toEqual({ diff: 0, percent: 0 });
  });
});
