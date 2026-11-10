import { onlyDigits } from './card';

const MAX_YEARS_AHEAD = 20;

/** Normalizes the expiry input to MM/YY while typing ("1227" → "12/27", "1/27" → "01/27"). */
export const formatExpiry = (raw: string): string => {
  if (raw.includes('/')) {
    const [m, ...rest] = raw.split('/');
    let month = onlyDigits(m).slice(0, 2);
    if (month.length === 1) month = `0${month}`;
    const year = onlyDigits(rest.join('')).slice(0, 2);
    return `${month}/${year}`;
  }
  const digits = onlyDigits(raw).slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
};

export const parseExpiry = (value: string): { month: string; year: string } | null => {
  const match = /^(\d{2})\/(\d{2})$/.exec(value);
  return match ? { month: match[1], year: match[2] } : null;
};

/** Valid when MM is 01–12, not expired (the current month counts) and at most 20 years ahead. */
export const isValidExpiry = (value: string, now: Date = new Date()): boolean => {
  const parsed = parseExpiry(value);
  if (!parsed) return false;
  const month = Number(parsed.month);
  if (month < 1 || month > 12) return false;
  const year = 2000 + Number(parsed.year);
  const monthsFromNow = (year - now.getFullYear()) * 12 + (month - (now.getMonth() + 1));
  return monthsFromNow >= 0 && monthsFromNow <= MAX_YEARS_AHEAD * 12;
};

export const isValidCvc = (value: string): boolean => /^\d{3}$/.test(value);

/** Letters (accents included) and spaces, 5–60 characters. */
export const isValidHolder = (value: string): boolean => {
  const trimmed = value.trim();
  return trimmed.length >= 5 && trimmed.length <= 60 && /^[\p{L} ]+$/u.test(trimmed);
};
