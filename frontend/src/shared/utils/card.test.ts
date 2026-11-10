import { formatCardNumber, luhn, onlyDigits } from './card';

describe('card number utils', () => {
  it.each([
    ['4242424242424242', true],
    ['4111111111111111', true],
    ['5555555555554444', true],
    ['2223003122003222', true],
    ['4242424242424241', false],
    ['1234567812345678', false],
  ])('AC-002-01 luhn(%s) is %s', (digits, expected) => {
    expect(luhn(digits)).toBe(expected);
  });

  it('AC-002-01 luhn rejects empty or non-numeric input', () => {
    expect(luhn('')).toBe(false);
    expect(luhn('4242 4242 4242 4242')).toBe(false);
  });

  it('AC-002-03 onlyDigits strips spaces, dashes and any non-numeric character', () => {
    expect(onlyDigits('4242-4242 4242.4242a')).toBe('4242424242424242');
  });

  it.each([
    ['4', '4'],
    ['42424', '4242 4'],
    ['4242424242424242', '4242 4242 4242 4242'],
    ['4242 4242-4242 4242', '4242 4242 4242 4242'],
    ['42424242424242429999', '4242 4242 4242 4242'],
  ])('AC-002-03 formatCardNumber(%s) groups by 4 and caps at 16 digits → %s', (raw, expected) => {
    expect(formatCardNumber(raw)).toBe(expected);
  });
});
