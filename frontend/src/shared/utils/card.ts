export const CARD_LENGTH = 16;

export const onlyDigits = (raw: string): string => raw.replace(/\D/g, '');

/** Luhn checksum. Expects digits only (call onlyDigits first). */
export const luhn = (digits: string): boolean => {
  if (!/^\d+$/.test(digits)) return false;
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

/** Normalizes any input (pasted with spaces/dashes) to at most 16 digits grouped by 4. */
export const formatCardNumber = (raw: string): string =>
  onlyDigits(raw)
    .slice(0, CARD_LENGTH)
    .replace(/(\d{4})(?=\d)/g, '$1 ');
