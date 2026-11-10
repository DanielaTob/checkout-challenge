import { useId, type InputHTMLAttributes, type ReactNode } from 'react';

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Error to show (the caller decides when: usually after blur). */
  error?: string;
  adornment?: ReactNode;
}

export function TextField({ label, value, onChange, error, adornment, className, ...input }: Props) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div className={['field', className].filter(Boolean).join(' ')}>
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      <div className="field__control">
        <input
          {...input}
          id={id}
          className="field__input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? errorId : undefined}
        />
        {adornment && <span className="field__adornment">{adornment}</span>}
      </div>
      {error && (
        <p id={errorId} className="field__error">
          {error}
        </p>
      )}
    </div>
  );
}
