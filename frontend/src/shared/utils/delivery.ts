import { onlyDigits } from './card';

export interface DeliveryForm {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  region: string;
  postalCode: string;
}

export type DeliveryErrors = Partial<Record<keyof DeliveryForm, string>>;

export const emptyDelivery: DeliveryForm = {
  fullName: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  region: '',
  postalCode: '',
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validateDelivery = (form: DeliveryForm): DeliveryErrors => {
  const errors: DeliveryErrors = {};
  const v = (k: keyof DeliveryForm) => form[k].trim();

  if (v('fullName').length < 3) errors.fullName = 'Ingresa tu nombre completo';
  if (!EMAIL.test(v('email'))) errors.email = 'Ingresa un email válido';
  if (onlyDigits(form.phone).length !== 10) errors.phone = 'El teléfono debe tener 10 dígitos';
  if (v('address').length < 5) errors.address = 'Ingresa una dirección válida';
  if (v('city').length < 2) errors.city = 'Ingresa la ciudad';
  if (v('region').length < 2) errors.region = 'Ingresa el departamento';
  if (!/^\d{6}$/.test(v('postalCode'))) errors.postalCode = 'El código postal debe tener 6 dígitos';

  return errors;
};
