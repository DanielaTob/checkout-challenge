import { BrandLogo } from '../../shared/ui/BrandLogo';
import type { CardSummary } from '../checkout/checkoutSlice';

const BRAND_LABEL = { VISA: 'VISA', MASTERCARD: 'MasterCard' } as const;

/** Only brand + last 4 digits: the full number is never rendered after the modal. */
export function MaskedCard({ card }: { card: CardSummary }) {
  return (
    <span className="masked-card">
      <BrandLogo brand={card.brand} />
      <span>{`${BRAND_LABEL[card.brand]} •••• ${card.last4}`}</span>
    </span>
  );
}
