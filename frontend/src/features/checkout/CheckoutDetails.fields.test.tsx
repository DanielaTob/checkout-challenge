import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithStore } from '../../test/renderWithStore';
import { CheckoutDetails } from './CheckoutDetails';
import { initialCheckoutState } from './checkoutSlice';

const setup = () =>
  renderWithStore(<CheckoutDetails />, {
    checkout: { ...initialCheckoutState, step: 'details', productId: '6f1d2c3a-0000-4000-8000-000000000001' },
  });
const field = (name: string) => screen.getByLabelText(name);

describe('CheckoutDetails — card fields', () => {
  it('AC-002-02 shows the VISA logo as soon as the number starts with 4', async () => {
    setup();
    await userEvent.type(field('Número de tarjeta'), '4');
    expect(screen.getByRole('img', { name: 'VISA' })).toBeInTheDocument();
  });

  it('AC-002-02 shows the MasterCard logo for 51–55 and 2221–2720 prefixes', async () => {
    setup();
    await userEvent.type(field('Número de tarjeta'), '2221');
    expect(screen.getByRole('img', { name: 'MasterCard' })).toBeInTheDocument();
  });

  it('AC-002-02 warns "Solo aceptamos VISA o MasterCard" for other brands', async () => {
    setup();
    await userEvent.type(field('Número de tarjeta'), '3782');
    expect(screen.getByText('Solo aceptamos VISA o MasterCard')).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /VISA|MasterCard/ })).not.toBeInTheDocument();
  });

  it('AC-002-03 groups digits by 4, ignores non-digits and caps at 16 digits', async () => {
    setup();
    await userEvent.type(field('Número de tarjeta'), '4242-4242 4242 42429999');
    expect(field('Número de tarjeta')).toHaveValue('4242 4242 4242 4242');
  });

  it('AC-002-01 flags a number that fails Luhn when leaving the field', async () => {
    setup();
    await userEvent.type(field('Número de tarjeta'), '4242424242424241');
    await userEvent.tab();
    expect(screen.getByText('Número de tarjeta inválido')).toBeInTheDocument();
  });

  it('AC-002-04 normalizes "1/27" to "01/27" and rejects an expired date', async () => {
    setup();
    await userEvent.type(field('Vencimiento (MM/AA)'), '1/27');
    expect(field('Vencimiento (MM/AA)')).toHaveValue('01/27');
    await userEvent.clear(field('Vencimiento (MM/AA)'));
    await userEvent.type(field('Vencimiento (MM/AA)'), '0120');
    await userEvent.tab();
    expect(screen.getByText('Fecha inválida o vencida')).toBeInTheDocument();
  });

  it('AC-002-05 the CVC is a password field with cc-csc autocomplete limited to 3 digits', async () => {
    setup();
    const cvc = field('CVC');
    expect(cvc).toHaveAttribute('type', 'password');
    expect(cvc).toHaveAttribute('autocomplete', 'cc-csc');
    await userEvent.type(cvc, '12a34');
    expect(cvc).toHaveValue('123');
  });

  it('AC-002-06 requires a valid holder name', async () => {
    setup();
    await userEvent.type(field('Nombre en la tarjeta'), 'Ana');
    await userEvent.tab();
    expect(screen.getByText('Escribe el nombre como aparece en la tarjeta')).toBeInTheDocument();
  });
});

describe('CheckoutDetails — delivery fields', () => {
  it('AC-002-07 shows each error under its field on blur, announced with aria-invalid and aria-describedby', async () => {
    setup();
    const email = field('Email');
    await userEvent.type(email, 'jose@');
    await userEvent.tab();
    const message = screen.getByText('Ingresa un email válido');
    expect(email).toHaveAttribute('aria-invalid', 'true');
    expect(email).toHaveAttribute('aria-describedby', message.id);
  });

  it('AC-002-07 does not show errors before the user leaves a field', async () => {
    setup();
    await userEvent.type(field('Teléfono'), '300');
    expect(screen.queryByText('El teléfono debe tener 10 dígitos')).not.toBeInTheDocument();
    expect(field('Teléfono')).toHaveAttribute('aria-invalid', 'false');
  });
});

describe('CheckoutDetails — input hints', () => {
  it('AC-002-11 uses numeric keyboards and the right autocomplete tokens', () => {
    setup();
    expect(field('Número de tarjeta')).toHaveAttribute('inputmode', 'numeric');
    expect(field('Número de tarjeta')).toHaveAttribute('autocomplete', 'cc-number');
    expect(field('Vencimiento (MM/AA)')).toHaveAttribute('autocomplete', 'cc-exp');
    expect(field('Vencimiento (MM/AA)')).toHaveAttribute('inputmode', 'numeric');
    expect(field('CVC')).toHaveAttribute('inputmode', 'numeric');
    expect(field('Nombre en la tarjeta')).toHaveAttribute('autocomplete', 'cc-name');
    expect(field('Email')).toHaveAttribute('autocomplete', 'email');
    expect(field('Teléfono')).toHaveAttribute('autocomplete', 'tel');
    expect(field('Código postal')).toHaveAttribute('autocomplete', 'postal-code');
  });
});
