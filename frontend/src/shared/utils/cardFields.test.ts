import { formatExpiry, isValidCvc, isValidExpiry, isValidHolder, parseExpiry } from './cardFields';

const NOW = new Date(2026, 10, 10); // 10 Nov 2026

describe('expiry', () => {
  it.each([
    ['11/26', true], // current month is still valid
    ['12/26', true],
    ['01/30', true],
    ['10/46', true], // within 20 years
    ['10/26', false], // expired last month
    ['00/27', false],
    ['13/27', false],
    ['12/46', false], // more than 20 years ahead
    ['1/27', false], // must be normalized first
    ['', false],
  ])('AC-002-04 isValidExpiry(%s) on 2026-11-10 is %s', (value, expected) => {
    expect(isValidExpiry(value, NOW)).toBe(expected);
  });

  it.each([
    ['1', '1'],
    ['12', '12'],
    ['123', '12/3'],
    ['1227', '12/27'],
    ['1/27', '01/27'],
    ['12/2799', '12/27'],
    ['ab12c27', '12/27'],
  ])('AC-002-04 formatExpiry(%s) → %s', (raw, expected) => {
    expect(formatExpiry(raw)).toBe(expected);
  });

  it('AC-002-04 parseExpiry returns month and 2-digit year strings', () => {
    expect(parseExpiry('08/29')).toEqual({ month: '08', year: '29' });
    expect(parseExpiry('8/29')).toBeNull();
  });
});

describe('cvc', () => {
  it.each([
    ['123', true],
    ['12', false],
    ['1234', false],
    ['12a', false],
  ])('AC-002-05 isValidCvc(%s) is %s', (value, expected) => {
    expect(isValidCvc(value)).toBe(expected);
  });
});

describe('holder', () => {
  it.each([
    ['José Pérez', true],
    ['Ana María Núñez', true],
    ['  Juan Diaz  ', true],
    ['Ana', false],
    ['Juan 3', false],
    ['J'.repeat(61), false],
    ['', false],
  ])('AC-002-06 isValidHolder(%j) is %s', (value, expected) => {
    expect(isValidHolder(value)).toBe(expected);
  });
});
