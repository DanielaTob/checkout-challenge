import { detectBrand } from './brand';

describe('detectBrand', () => {
  it.each([
    ['4', 'VISA'],
    ['4242424242424242', 'VISA'],
    ['51', 'MASTERCARD'],
    ['5555555555554444', 'MASTERCARD'],
    ['2221', 'MASTERCARD'],
    ['2720999999999999', 'MASTERCARD'],
  ])('AC-002-02 %s → %s', (digits, brand) => {
    expect(detectBrand(digits)).toBe(brand);
  });

  it.each([['3782'], ['6011'], ['56'], ['2220'], ['2721'], ['1']])(
    'AC-002-02 %s is an unsupported brand',
    (digits) => {
      expect(detectBrand(digits)).toBe('UNSUPPORTED');
    },
  );

  it.each([[''], ['5'], ['2'], ['22'], ['272']])(
    'AC-002-02 %s is still undetermined (could become MasterCard)',
    (digits) => {
      expect(detectBrand(digits)).toBeNull();
    },
  );
});
