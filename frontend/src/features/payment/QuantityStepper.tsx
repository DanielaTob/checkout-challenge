export const MAX_QUANTITY = 10;

interface Props {
  value: number;
  max: number;
  onChange: (value: number) => void;
  /** While paying the order cannot change. */
  disabled?: boolean;
}

export function QuantityStepper({ value, max, onChange, disabled = false }: Props) {
  const limit = Math.min(max, MAX_QUANTITY);
  return (
    <div className="stepper" role="group" aria-label="Cantidad">
      <button type="button" className="stepper__button" aria-label="Disminuir cantidad" disabled={disabled || value <= 1} onClick={() => onChange(value - 1)}>
        −
      </button>
      <span className="stepper__value" aria-live="polite">
        Cantidad: {value}
      </span>
      <button type="button" className="stepper__button" aria-label="Aumentar cantidad" disabled={disabled || value >= limit} onClick={() => onChange(value + 1)}>
        +
      </button>
    </div>
  );
}
