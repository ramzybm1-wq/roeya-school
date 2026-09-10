/**
 * Stitch Design System Tokens - 'Institutional Excellence' Theme.
 * Visual Source of Truth.
 */

export const COLOR_TOKENS = {
  // Brand Primary & Structural
  primary: '#091426',
  primaryNavy: '#1e293b', // Deep Navy Blue (Sidebar, headers, frames of authority)
  primaryContainer: '#1e293b',
  onPrimary: '#ffffff',
  onPrimaryContainer: '#8590a6',
  primaryFixed: '#d8e3fb',
  primaryFixedDim: '#bcc7de',

  // Brand Secondary & Action
  secondary: '#0058be',
  secondaryAction: '#3b82f6', // Professional Blue (Primary buttons, active states, key accents)
  secondaryContainer: '#2170e4',
  onSecondary: '#ffffff',
  onSecondaryContainer: '#fefcff',
  secondaryFixed: '#d8e2ff',
  secondaryFixedDim: '#adc6ff',

  // Tertiary
  tertiary: '#1e1200',
  tertiaryContainer: '#35260c',
  onTertiary: '#ffffff',
  onTertiaryContainer: '#a38c6a',

  // Surfaces & Backgrounds
  background: '#f8fafc', // Very light gray content workspace
  surface: '#ffffff', // Cards and data containers
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#f5f3f4',
  surfaceContainer: '#f0edef',
  surfaceContainerHigh: '#eae7e9',
  surfaceContainerHighest: '#e4e2e3',
  surfaceDim: '#dcd9db',
  surfaceBright: '#fbf8fa',

  // Typography & On-Surface
  onSurface: '#1b1b1d',
  onSurfaceVariant: '#45474c',
  inverseSurface: '#303032',
  inverseOnSurface: '#f3f0f2',
  outline: '#75777d',
  outlineVariant: '#c5c6cd',
  borderSubtle: '#e2e8f0',

  // Semantic Status Colors
  success: '#10b981', // Emerald for Accepted
  successBg: '#ecfdf5',
  successText: '#065f46',

  warning: '#f59e0b', // Amber for Pending / Waiting List
  warningBg: '#fffbeb',
  warningText: '#92400e',

  error: '#ba1a1a', // Rose / Red for Refused / Error
  errorContainer: '#ffdad6',
  onError: '#ffffff',
  onErrorContainer: '#93000a',
  errorBg: '#fef2f2',
  errorText: '#991b1b',

  info: '#0284c7', // Sky Blue for Info / In Review
  infoBg: '#f0f9ff',
  infoText: '#075985',
} as const;
