import { detectBrand, type CardBrand } from '../../shared/utils/brand';
import { CARD_LENGTH, luhn, onlyDigits } from '../../shared/utils/card';
import { isValidCvc, isValidExpiry, isValidHolder } from '../../shared/utils/cardFields';

export interface CardForm {
  number: string; // formatted, e.g. "4242 4242 4242 4242"
  expiry: string; // MM/YY
  cvc: string;
  holderName: string;
}

export type CardErrors = Partial<Record<keyof CardForm, string>>;

export const emptyCard: CardForm = { number: '', expiry: '', cvc: '', holderName: '' };

export const UNSUPPORTED_BRAND = 'Solo aceptamos VISA o MasterCard';

export const cardBrand = (form: CardForm): CardBrand | null => {
  const brand = detectBrand(onlyDigits(form.number));
  return brand === 'UNSUPPORTED' ? null : brand;
};

export const validateCard = (form: CardForm, now: Date = new Date()): CardErrors => {
  const errors: CardErrors = {};
  const digits = onlyDigits(form.number);
  const brand = detectBrand(digits);
  if (brand === 'UNSUPPORTED') errors.number = UNSUPPORTED_BRAND;
  else if (digits.length !== CARD_LENGTH || !luhn(digits) || brand === null) errors.number = 'Número de tarjeta inválido';
  if (!isValidExpiry(form.expiry, now)) errors.expiry = 'Fecha inválida o vencida';
  if (!isValidCvc(form.cvc)) errors.cvc = 'El CVC tiene 3 dígitos';
  if (!isValidHolder(form.holderName)) errors.holderName = 'Escribe el nombre como aparece en la tarjeta';
  return errors;
};
