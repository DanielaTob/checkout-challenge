import type { InputHTMLAttributes } from 'react';
import { TextField } from '../../shared/ui/TextField';
import type { DeliveryErrors, DeliveryForm } from '../../shared/utils/delivery';

interface Props {
  value: DeliveryForm;
  errors: DeliveryErrors;
  touched: Partial<Record<keyof DeliveryForm, boolean>>;
  onChange: (value: DeliveryForm) => void;
  onBlur: (field: keyof DeliveryForm) => void;
}

type InputHints = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'onBlur'>;

const FIELDS: { key: keyof DeliveryForm; label: string; input: InputHints }[] = [
  { key: 'fullName', label: 'Nombre completo', input: { autoComplete: 'name' } },
  { key: 'email', label: 'Email', input: { type: 'email', autoComplete: 'email', inputMode: 'email' } },
  { key: 'phone', label: 'Teléfono', input: { type: 'tel', autoComplete: 'tel', inputMode: 'tel' } },
  { key: 'address', label: 'Dirección', input: { autoComplete: 'street-address' } },
  { key: 'city', label: 'Ciudad', input: { autoComplete: 'address-level2' } },
  { key: 'region', label: 'Departamento', input: { autoComplete: 'address-level1' } },
  { key: 'postalCode', label: 'Código postal', input: { autoComplete: 'postal-code', inputMode: 'numeric', maxLength: 6 } },
];

export function DeliveryFields({ value, errors, touched, onChange, onBlur }: Props) {
  return (
    <fieldset className="form-section">
      <legend className="form-section__title">Datos de entrega</legend>
      {FIELDS.map(({ key, label, input }) => (
        <TextField
          {...input}
          key={key}
          label={label}
          value={value[key]}
          onChange={(v) => onChange({ ...value, [key]: v })}
          onBlur={() => onBlur(key)}
          error={touched[key] ? errors[key] : undefined}
        />
      ))}
    </fieldset>
  );
}
