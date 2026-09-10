/**
 * BrandLogo Component for VISION SCHOOL.
 * Renders logo using object-fit: contain to prevent cropping/stretching.
 * Includes text fallback if no image is available.
 */

export interface BrandLogoProps {
  src?: string | null;
  alt?: string;
  fallbackText?: string;
  height?: number | string;
  width?: number | string;
  className?: string;
}

export function BrandLogo(props: BrandLogoProps) {
  const {
    src,
    alt = 'VISION SCHOOL',
    fallbackText = 'VISION SCHOOL',
    height = 40,
    width = 'auto',
    className = 'vision-school-logo',
  } = props;

  return {
    component: 'BrandLogo',
    src: src || null,
    alt,
    fallbackText,
    style: {
      height,
      width,
      objectFit: 'contain',
    },
    className,
  };
}
