import { type CardInput, detectBrand, luhnValid, validateCard } from './card';

const now = new Date('2026-11-10T12:00:00Z');
const visa: CardInput = {
  number: '4242424242424242',
  cvc: '123',
  expMonth: '12',
  expYear: '29',
  holderName: 'Ana Perez',
};

const codeOf = (card: Partial<CardInput>) => {
  const r = validateCard({ ...visa, ...card }, now);
  return r.ok ? 'OK' : r.error.code;
};

describe('validateCard', () => {
  it('AC-004-05 accepts a valid VISA and keeps only brand and last 4', () => {
    expect(validateCard(visa, now)).toEqual({
      ok: true,
      value: { brand: 'VISA', last4: '4242' },
    });
  });

  it('AC-004-05 detects MasterCard (51-55 and 2221-2720 ranges)', () => {
    expect(
      validateCard({ ...visa, number: '5555 5555 5555 4444' }, now),
    ).toEqual({ ok: true, value: { brand: 'MASTERCARD', last4: '4444' } });
    expect(detectBrand('2223003122003222')).toBe('MASTERCARD');
    expect(detectBrand('378282246310005')).toBeNull();
  });

  it.each<[string, Partial<CardInput>]>([
    ['fails Luhn', { number: '4242424242424241' }],
    ['is not numeric', { number: '4242abcd42424242' }],
    ['is an unsupported brand (AMEX)', { number: '378282246310005' }],
    ['is expired', { expMonth: '10', expYear: '26' }],
    ['has an invalid month', { expMonth: '13' }],
    ['has a one digit month', { expMonth: '1' }],
    ['has an invalid year', { expYear: '2029' }],
    ['has an invalid CVC', { cvc: '12' }],
  ])('AC-004-05 rejects with VALIDATION a card that %s', (_, card) => {
    expect(codeOf(card)).toBe('VALIDATION');
  });

  it('AC-004-05 a card expiring this month is still valid', () => {
    expect(codeOf({ expMonth: '11', expYear: '26' })).toBe('OK');
  });

  it('luhnValid rejects too short numbers', () => {
    expect(luhnValid('42')).toBe(false);
  });
});
