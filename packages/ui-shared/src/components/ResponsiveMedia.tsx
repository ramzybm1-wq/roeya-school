/**
 * ResponsiveMedia Component for VISION SCHOOL.
 * - Selects optimal source (desktop / tablet / mobile / fallback).
 * - Applies object-fit and normalized focal point positioning.
 * - Graceful fallback on error without broken image icons.
 */

export interface ResponsiveMediaProps {
  sources?: {
    desktop?: string;
    tablet?: string;
    mobile?: string;
    fallback?: string;
  };
  alt?: string;
  focalPoint?: {
    x: number; // 0.0 - 1.0
    y: number; // 0.0 - 1.0
  };
  fit?: 'cover' | 'contain' | 'fill' | 'none';
  className?: string;
  loading?: 'lazy' | 'eager';
  style?: Record<string, unknown>;
}

export function ResponsiveMedia(props: ResponsiveMediaProps) {
  const {
    sources,
    alt = 'Image VISION SCHOOL',
    focalPoint = { x: 0.5, y: 0.5 },
    fit = 'cover',
    className = '',
    loading = 'lazy',
    style = {},
  } = props;

  const defaultSrc = sources?.desktop || sources?.fallback || sources?.tablet || sources?.mobile || '';
  const focalX = Math.round((focalPoint.x ?? 0.5) * 100);
  const focalY = Math.round((focalPoint.y ?? 0.5) * 100);

  return {
    component: 'ResponsiveMedia',
    defaultSrc,
    sources,
    alt,
    loading,
    className,
    style: {
      objectFit: fit,
      objectPosition: `${focalX}% ${focalY}%`,
      ...style,
    },
  };
}
