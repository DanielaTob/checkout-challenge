import { REDACTED, redact, redactText } from './redact';

describe('redact (spec 010)', () => {
  it.each([
    ['4242424242424242', true],
    ['4242 4242 4242 4242', true],
    ['4242-4242-4242-4242', true],
    ['5555555555554444', true],
    ['378282246310005', true], // 15-digit card (Amex)
    ['3782 822463 10005', true], // Amex 4-6-5 with spaces
    ['3782-822463-10005', true],
    ['123456789012', false], // 12 digits: not a card number
    ['2026-11-11T23:00:00.000Z', false],
    ['TX-6f1d2c3a-0000-4000-8000-000000000001', false],
  ])(
    'AC-010-07 redacts card-like digit runs in text: %s → %s',
    (text, redacted) => {
      expect(redactText(`card ${text} end`).includes(REDACTED)).toBe(redacted);
    },
  );

  it('AC-010-07 redacts sensitive keys at any depth and card numbers inside other strings', () => {
    expect(
      redact({
        message: 'charging 4111111111111111',
        card: { number: '4111', cvc: '123', cvv: '1', pan: 'x', last4: '1111' },
        list: [{ cardNumber: 'y', CVV2: 'z' }],
        durationMs: 12,
        nothing: null,
      }),
    ).toEqual({
      message: `charging ${REDACTED}`,
      card: {
        number: REDACTED,
        cvc: REDACTED,
        cvv: REDACTED,
        pan: REDACTED,
        last4: '1111',
      },
      list: [{ cardNumber: REDACTED, CVV2: REDACTED }],
      durationMs: 12,
      nothing: null,
    });
  });
});
