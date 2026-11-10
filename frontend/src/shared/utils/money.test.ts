import { formatCop } from './money';

// Intl uses a non-breaking space between symbol and amount; normalize for readable assertions.
const plain = (s: string) => s.replace(/ /g, ' ');

describe('formatCop', () => {
  it.each([
    [24990000, '$ 249.900'],
    [18990000, '$ 189.900'],
    [100, '$ 1'],
    [0, '$ 0'],
  ])('AC-001-06 formats %i cents as %s (COP, no decimals)', (cents, expected) => {
    expect(plain(formatCop(cents))).toBe(expected);
  });

  it('AC-001-06 rounds cents to the nearest peso', () => {
    expect(plain(formatCop(24990050))).toBe('$ 249.901');
    expect(plain(formatCop(24990049))).toBe('$ 249.900');
  });
});
