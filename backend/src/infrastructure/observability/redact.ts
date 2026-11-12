/**
 * Defensive redaction for log entries (spec 010, AGENTS.md rule 5). The code never logs card
 * data on purpose; this is the safety net if someone does by mistake.
 */
export const REDACTED = '[REDACTED]';

const SENSITIVE_KEY = /^(number|card_?number|pan|cvc|cvv2?)$/i;
// 13–19 consecutive digits, 4-digit groups (Visa/Mastercard) or Amex 4-6-5, separated by spaces
// or dashes (how card numbers are written). Not any dash-separated digits: UUIDs such as
// 0000-4000-8000-000000000001 must survive. Trade-off: a 13–19 digit numeric id is redacted too.
const CARD_NUMBER =
  /\b(?:\d{13,19}|\d{4}(?:[ -]\d{4}){2}[ -]\d{4}(?:[ -]?\d{1,3})?|\d{4}[ -]\d{6}[ -]\d{5})\b/g;

export const redactText = (text: string): string =>
  text.replace(CARD_NUMBER, REDACTED);

export const redact = (value: unknown, depth = 0): unknown => {
  if (typeof value === 'string') return redactText(value);
  if (value === null || typeof value !== 'object' || depth > 8) return value;
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  return Object.fromEntries(
    Object.entries(value).map(([k, v]) => [
      k,
      SENSITIVE_KEY.test(k) ? REDACTED : redact(v, depth + 1),
    ]),
  );
};
