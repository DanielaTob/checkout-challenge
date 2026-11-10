import type { CheckoutStep } from '../features/checkout/checkoutSlice';

const STEPS: { id: CheckoutStep; label: string }[] = [
  { id: 'product', label: 'Producto' },
  { id: 'details', label: 'Datos' },
  { id: 'summary', label: 'Resumen' },
  { id: 'result', label: 'Resultado' },
];

/** Visual progress indicator (1. Producto — 2. Datos — 3. Resumen — 4. Resultado). */
export function CheckoutProgress({ step }: { step: CheckoutStep }) {
  const current = STEPS.findIndex((s) => s.id === step);
  return (
    <nav className="progress" aria-label="Progreso del pago">
      <ol className="progress__list">
        {STEPS.map((s, i) => (
          <li
            key={s.id}
            className={['progress__step', i < current && 'progress__step--done', i === current && 'progress__step--current']
              .filter(Boolean)
              .join(' ')}
            aria-current={i === current ? 'step' : undefined}
          >
            <span className="progress__index" aria-hidden="true">
              {i < current ? '✓' : i + 1}
            </span>
            <span className="progress__label">{s.label}</span>
          </li>
        ))}
      </ol>
    </nav>
  );
}
