export type CardBrand = 'VISA' | 'MASTERCARD';

const MC_2_SERIES = { min: 2221, max: 2720 };

/**
 * Detects the brand from the leading digits while the user types.
 * - 'VISA' / 'MASTERCARD' once the prefix is conclusive,
 * - null while it is still undetermined (e.g. "5" or "22" may become MasterCard),
 * - 'UNSUPPORTED' once no supported brand can match.
 */
export const detectBrand = (digits: string): CardBrand | 'UNSUPPORTED' | null => {
  if (digits.length === 0) return null;
  if (digits[0] === '4') return 'VISA';

  if (digits[0] === '5') {
    if (digits.length === 1) return null;
    return digits[1] >= '1' && digits[1] <= '5' ? 'MASTERCARD' : 'UNSUPPORTED';
  }

  if (digits[0] === '2') {
    const prefix = digits.slice(0, 4);
    const scale = 10 ** (4 - prefix.length);
    const low = Number(prefix) * scale; // smallest 4-digit number with this prefix
    const high = low + scale - 1; // largest
    if (high < MC_2_SERIES.min || low > MC_2_SERIES.max) return 'UNSUPPORTED';
    if (low >= MC_2_SERIES.min && high <= MC_2_SERIES.max) return 'MASTERCARD';
    return null;
  }

  return 'UNSUPPORTED';
};
