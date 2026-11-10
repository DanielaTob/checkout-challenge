import { BrandLogo } from '../../shared/ui/BrandLogo';
import { TextField } from '../../shared/ui/TextField';
import { formatCardNumber, onlyDigits } from '../../shared/utils/card';
import { formatExpiry } from '../../shared/utils/cardFields';
import { cardBrand, UNSUPPORTED_BRAND, type CardErrors, type CardForm } from './cardForm';

interface Props {
  value: CardForm;
  errors: CardErrors;
  touched: Partial<Record<keyof CardForm, boolean>>;
  onChange: (value: CardForm) => void;
  onBlur: (field: keyof CardForm) => void;
}

export function CardFields({ value, errors, touched, onChange, onBlur }: Props) {
  const brand = cardBrand(value);
  const set = (patch: Partial<CardForm>) => onChange({ ...value, ...patch });
  const show = (k: keyof CardForm) => (touched[k] ? errors[k] : undefined);
  // An unsupported brand is reported while typing, not only on blur.
  const numberError = errors.number === UNSUPPORTED_BRAND ? errors.number : show('number');

  return (
    <fieldset className="form-section">
      <legend className="form-section__title">Tarjeta</legend>
      <TextField
        label="Número de tarjeta"
        value={value.number}
        onChange={(v) => set({ number: formatCardNumber(v) })}
        onBlur={() => onBlur('number')}
        error={numberError}
        inputMode="numeric"
        autoComplete="cc-number"
        placeholder="0000 0000 0000 0000"
        adornment={brand && <BrandLogo brand={brand} />}
      />
      <div className="form-row">
        <TextField
          label="Vencimiento (MM/AA)"
          value={value.expiry}
          onChange={(v) => set({ expiry: formatExpiry(v) })}
          onBlur={() => onBlur('expiry')}
          error={show('expiry')}
          inputMode="numeric"
          autoComplete="cc-exp"
          placeholder="MM/AA"
        />
        <TextField
          label="CVC"
          value={value.cvc}
          onChange={(v) => set({ cvc: onlyDigits(v).slice(0, 3) })}
          onBlur={() => onBlur('cvc')}
          error={show('cvc')}
          type="password"
          inputMode="numeric"
          autoComplete="cc-csc"
          maxLength={3}
        />
      </div>
      <TextField
        label="Nombre en la tarjeta"
        value={value.holderName}
        onChange={(v) => set({ holderName: v })}
        onBlur={() => onBlur('holderName')}
        error={show('holderName')}
        autoComplete="cc-name"
        autoCapitalize="characters"
      />
    </fieldset>
  );
}
