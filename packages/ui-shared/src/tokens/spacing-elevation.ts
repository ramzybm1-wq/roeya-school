/**
 * Stitch Design System - Spacing, Dimensions, Radii, and Elevation Tokens.
 */

export const SPACING_TOKENS = {
  containerMaxWidth: '1440px',
  sidebarWidth: '280px',
  sidebarCollapsedWidth: '80px',
  headerHeight: '70px',
  gutter: '24px',
  marginMobile: '16px',
  marginDesktop: '32px',
  stackSm: '8px',
  stackMd: '16px',
  stackLg: '24px',
} as const;

export const RADIUS_TOKENS = {
  sm: '4px', // 0.25rem
  default: '8px', // 0.5rem (Buttons & Inputs standard)
  md: '12px', // 0.75rem
  lg: '16px', // 1rem
  xl: '24px', // 1.5rem (Dashboard Cards standard)
  full: '9999px', // Pills & Status Badges
} as const;

export const ELEVATION_TOKENS = {
  level0: 'none',
  level1: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)', // Cards & Tables
  level2: '0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -1px rgba(0, 0, 0, 0.04)', // KPI Cards & Hover
  level3: '0 10px 15px -3px rgba(0, 0, 0, 0.12), 0 4px 6px -2px rgba(0, 0, 0, 0.05)', // Modals & Popovers
} as const;
