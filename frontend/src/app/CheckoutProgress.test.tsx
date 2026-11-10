import { render, screen } from '@testing-library/react';
import { CheckoutProgress } from './CheckoutProgress';

describe('CheckoutProgress', () => {
  it.each([
    ['product', 'Producto'],
    ['details', 'Datos'],
    ['summary', 'Resumen'],
    ['result', 'Resultado'],
  ] as const)('marks the %s step as current (%s)', (step, label) => {
    render(<CheckoutProgress step={step} />);
    const nav = screen.getByRole('navigation', { name: 'Progreso del pago' });
    expect(nav).toBeInTheDocument();
    expect(screen.getByText(label).closest('li')).toHaveAttribute('aria-current', 'step');
    expect(screen.getAllByRole('listitem')).toHaveLength(4);
  });

  it('marks earlier steps as done', () => {
    render(<CheckoutProgress step="summary" />);
    expect(screen.getByText('Producto').closest('li')).toHaveClass('progress__step--done');
    expect(screen.getByText('Datos').closest('li')).toHaveClass('progress__step--done');
    expect(screen.getByText('Resultado').closest('li')).not.toHaveClass('progress__step--done');
  });
});
