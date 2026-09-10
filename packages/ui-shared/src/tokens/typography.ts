/**
 * Stitch Design System - Typography Tokens (Inter font family).
 */

export const TYPOGRAPHY_TOKENS = {
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  fontFamilyArabic: '"Noto Sans Arabic", "Tajawal", Inter, sans-serif',

  displayLg: {
    fontFamily: 'Inter',
    fontSize: '36px',
    fontWeight: '700',
    lineHeight: '44px',
    letterSpacing: '-0.02em',
  },
  headlineMd: {
    fontFamily: 'Inter',
    fontSize: '24px',
    fontWeight: '600',
    lineHeight: '32px',
    letterSpacing: '-0.01em',
  },
  headlineSm: {
    fontFamily: 'Inter',
    fontSize: '20px',
    fontWeight: '600',
    lineHeight: '28px',
  },
  bodyLg: {
    fontFamily: 'Inter',
    fontSize: '16px',
    fontWeight: '400',
    lineHeight: '24px',
  },
  bodyMd: {
    fontFamily: 'Inter',
    fontSize: '14px',
    fontWeight: '400',
    lineHeight: '20px',
  },
  labelMd: {
    fontFamily: 'Inter',
    fontSize: '12px',
    fontWeight: '600',
    lineHeight: '16px',
    letterSpacing: '0.05em',
  },
  caption: {
    fontFamily: 'Inter',
    fontSize: '12px',
    fontWeight: '400',
    lineHeight: '16px',
  },
} as const;
