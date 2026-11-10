import { domainError, type DomainError } from '../shared/domain-error';
import { err, ok, type Result } from '../shared/result';

/**
 * Raw card data. Lives only in memory for the duration of one request: it is sent to
 * the gateway for tokenization and is never stored, logged or returned.
 */
export interface CardInput {
  readonly number: string;
  readonly cvc: string;
  /** "MM" */
  readonly expMonth: string;
  /** "YY" */
  readonly expYear: string;
  readonly holderName: string;
}

export type CardBrand = 'VISA' | 'MASTERCARD';

/** The only card data the system keeps. */
export interface CardSummary {
  readonly brand: CardBrand;
  readonly last4: string;
}

export const luhnValid = (digits: string): boolean => {
  if (!/^\d{12,19}$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
};

export const detectBrand = (digits: string): CardBrand | null => {
  if (/^4/.test(digits)) return 'VISA';
  const two = Number(digits.slice(0, 2));
  const four = Number(digits.slice(0, 4));
  if ((two >= 51 && two <= 55) || (four >= 2221 && four <= 2720)) {
    return 'MASTERCARD';
  }
  return null;
};

/** A card is valid through the last day of its expiration month. */
export const isExpired = (
  expMonth: string,
  expYear: string,
  now: Date,
): boolean => {
  const month = Number(expMonth);
  const year = 2000 + Number(expYear);
  const current = now.getUTCFullYear() * 12 + now.getUTCMonth();
  return year * 12 + (month - 1) < current;
};

const invalid = (message: string) => err(domainError('VALIDATION', message));

export const validateCard = (
  card: CardInput,
  now: Date,
): Result<CardSummary, DomainError> => {
  const digits = card.number.replace(/\s+/g, '');
  if (!luhnValid(digits)) return invalid('Card number is not valid');
  const brand = detectBrand(digits);
  if (!brand) return invalid('Only VISA and MasterCard are supported');
  const month = Number(card.expMonth);
  if (!/^\d{2}$/.test(card.expMonth) || month < 1 || month > 12) {
    return invalid('Expiration month is not valid');
  }
  if (!/^\d{2}$/.test(card.expYear)) {
    return invalid('Expiration year is not valid');
  }
  if (isExpired(card.expMonth, card.expYear, now)) {
    return invalid('Card is expired');
  }
  if (!/^\d{3,4}$/.test(card.cvc)) return invalid('CVC is not valid');
  return ok({ brand, last4: digits.slice(-4) });
};
