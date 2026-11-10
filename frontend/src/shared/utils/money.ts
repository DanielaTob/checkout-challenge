const cop = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** Formats an amount in COP cents as pesos without decimals, e.g. 24990000 → "$ 249.900". */
export const formatCop = (cents: number): string => cop.format(Math.round(cents / 100));
