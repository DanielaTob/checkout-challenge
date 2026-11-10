import type { CardBrand } from '../utils/brand';

interface Props {
  brand: CardBrand;
}

/** Simplified inline brand marks (no external requests, crisp at any size). */
export function BrandLogo({ brand }: Props) {
  if (brand === 'VISA') {
    return (
      <svg className="brand-logo" viewBox="0 0 48 32" role="img" aria-label="VISA">
        <rect width="48" height="32" rx="4" fill="#1a1f71" />
        <text x="24" y="21" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="13" fontStyle="italic" fontWeight="700" fill="#fff">
          VISA
        </text>
      </svg>
    );
  }
  return (
    <svg className="brand-logo" viewBox="0 0 48 32" role="img" aria-label="MasterCard">
      <rect width="48" height="32" rx="4" fill="#1f2a44" />
      <circle cx="19" cy="16" r="9" fill="#eb001b" />
      <circle cx="29" cy="16" r="9" fill="#f79e1b" fillOpacity="0.9" />
    </svg>
  );
}
