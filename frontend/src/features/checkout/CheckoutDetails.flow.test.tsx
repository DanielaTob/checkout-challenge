import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../../app/App';
import { renderWithStore } from '../../test/renderWithStore';
import { emptyDelivery } from '../../shared/utils/delivery';
import { initialCheckoutState } from './checkoutSlice';

jest.mock('../../shared/api/http', () => ({
  ...jest.requireActual<typeof import('../../shared/api/http')>('../../shared/api/http'),
  getJson: jest.fn(() => Promise.resolve([])),
}));

const productId = '6f1d2c3a-0000-4000-8000-000000000001';
const setup = (delivery = emptyDelivery) =>
  renderWithStore(<App />, { checkout: { ...initialCheckoutState, step: 'details', productId, delivery } });
const field = (name: string) => screen.getByLabelText(name);
const continueButton = () => screen.getByRole('button', { name: 'Continuar' });

const fillValidForm = async () => {
  await userEvent.type(field('Número de tarjeta'), '4242424242424242');
  await userEvent.type(field('Vencimiento (MM/AA)'), '0829');
  await userEvent.type(field('CVC'), '123');
  await userEvent.type(field('Nombre en la tarjeta'), 'Jose Perez');
  await userEvent.type(field('Nombre completo'), 'José Pérez');
  await userEvent.type(field('Email'), 'jose@example.com');
  await userEvent.type(field('Teléfono'), '3001234567');
  await userEvent.type(field('Dirección'), 'Calle 10 # 20-30');
  await userEvent.type(field('Ciudad'), 'Medellín');
  await userEvent.type(field('Departamento'), 'Antioquia');
  await userEvent.type(field('Código postal'), '050021');
};

describe('CheckoutDetails — continue and close', () => {
  it('AC-002-08 keeps Continuar disabled while any field is invalid', async () => {
    setup();
    expect(continueButton()).toBeDisabled();
    await fillValidForm();
    await userEvent.clear(field('CVC'));
    await userEvent.type(field('CVC'), '12');
    expect(continueButton()).toBeDisabled();
  });

  it('AC-002-08 AC-002-09 continues to the summary storing brand, last4 and delivery; the full card stays in memory only', async () => {
    const { store } = setup();
    await fillValidForm();
    expect(continueButton()).toBeEnabled();
    await userEvent.click(continueButton());

    const { checkout, cardSession } = store.getState();
    expect(checkout.step).toBe('summary');
    expect(checkout.card).toEqual({ brand: 'VISA', last4: '4242' });
    expect(checkout.delivery).toMatchObject({ fullName: 'José Pérez', postalCode: '050021' });
    expect(JSON.stringify(checkout)).not.toMatch(/4242424242424242|"123"|08\/29/);
    expect(cardSession).toEqual({ number: '4242424242424242', expiry: '08/29', cvc: '123', holderName: 'Jose Perez' });
  });

  it('AC-002-10 closing with ✕ returns to the product screen keeping delivery data and wiping card data', async () => {
    const { store } = setup();
    await fillValidForm();
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cerrar' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(store.getState().checkout.step).toBe('product');
    expect(store.getState().checkout.delivery).toMatchObject({ fullName: 'José Pérez', city: 'Medellín' });
    expect(store.getState().checkout.card).toBeNull();
    expect(store.getState().cardSession).toBeNull();
  });

  it('AC-002-10 reopening keeps the delivery data that was already saved', () => {
    setup({ ...emptyDelivery, fullName: 'José Pérez', city: 'Medellín' });
    expect(field('Nombre completo')).toHaveValue('José Pérez');
    expect(field('Ciudad')).toHaveValue('Medellín');
    expect(field('Número de tarjeta')).toHaveValue('');
  });

  it('AC-002-10 Escape closes the modal', async () => {
    const { store } = setup();
    await userEvent.keyboard('{Escape}');
    expect(store.getState().checkout.step).toBe('product');
  });
});
