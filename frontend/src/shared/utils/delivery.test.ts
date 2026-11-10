import { emptyDelivery, validateDelivery, type DeliveryForm } from './delivery';

const valid: DeliveryForm = {
  fullName: 'José Pérez',
  email: 'jose@example.com',
  phone: '3001234567',
  address: 'Calle 10 # 20-30',
  city: 'Medellín',
  region: 'Antioquia',
  postalCode: '050021',
};

describe('validateDelivery', () => {
  it('AC-002-07 accepts complete, well-formed delivery data', () => {
    expect(validateDelivery(valid)).toEqual({});
  });

  it('AC-002-07 requires every field', () => {
    expect(Object.keys(validateDelivery(emptyDelivery)).sort()).toEqual(
      ['address', 'city', 'email', 'fullName', 'phone', 'postalCode', 'region'].sort(),
    );
    expect(validateDelivery(emptyDelivery).fullName).toBe('Ingresa tu nombre completo');
  });

  it.each<[keyof DeliveryForm, string, string]>([
    ['email', 'jose@', 'Ingresa un email válido'],
    ['email', 'jose example.com', 'Ingresa un email válido'],
    ['phone', '300123456', 'El teléfono debe tener 10 dígitos'],
    ['phone', '30012345678', 'El teléfono debe tener 10 dígitos'],
    ['postalCode', '0500', 'El código postal debe tener 6 dígitos'],
    ['fullName', 'Jo', 'Ingresa tu nombre completo'],
    ['address', 'Cl', 'Ingresa una dirección válida'],
  ])('AC-002-07 rejects %s = %j with "%s"', (field, value, message) => {
    expect(validateDelivery({ ...valid, [field]: value })[field]).toBe(message);
  });

  it('AC-002-07 ignores surrounding spaces and accepts formatted phone numbers', () => {
    expect(validateDelivery({ ...valid, email: '  jose@example.com ', phone: '300 123 4567' })).toEqual({});
  });
});
