import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { aTransaction, headphones, quoteFor } from '../test/fixtures';
import { bootPersistedStore, PERSIST_KEY } from '../test/persist';
import { App } from './App';

jest.mock('../shared/api/http', () => ({
  ...jest.requireActual<typeof import('../shared/api/http')>('../shared/api/http'),
  getJson: jest.fn(),
  postJson: jest.fn(),
}));
const { getJson, postJson } = jest.requireMock<{ getJson: jest.Mock; postJson: jest.Mock }>('../shared/api/http');

const DELIVERY = {
  'Nombre completo': 'José Pérez',
  Email: 'jose@example.com',
  Teléfono: '3001234567',
  Dirección: 'Calle 10 # 20-30',
  Ciudad: 'Medellín',
  Departamento: 'Antioquia',
  'Código postal': '050021',
};
const DELIVERY_FIELDS = Object.keys(DELIVERY);

/** Boots the real persisted store (reads whatever is in localStorage) and renders the app. */
const boot = async () => {
  const { store, persistor } = await bootPersistedStore();
  const view = render(
    <Provider store={store}>
      <App />
    </Provider>,
  );
  const stored = async () => {
    await persistor.flush();
    return window.localStorage.getItem(PERSIST_KEY) ?? '';
  };
  return { store, stored, unmount: view.unmount };
};

const buyWith = async (number: string) => {
  await userEvent.click(await screen.findByRole('button', { name: 'Pay with credit card' }));
  const type = (label: string, value: string) => userEvent.type(screen.getByLabelText(label), value);
  await type('Número de tarjeta', number);
  await type('Vencimiento (MM/AA)', '0829');
  await type('CVC', '987');
  await type('Nombre en la tarjeta', 'Jose Perez');
  for (const [label, value] of Object.entries(DELIVERY)) await type(label, value);
  await userEvent.click(screen.getByRole('button', { name: 'Continuar' }));
  await screen.findByText('Total', { exact: true });
  await userEvent.click(screen.getByRole('button', { name: /Pagar/ }));
};

const expectEmptyModal = async () => {
  await userEvent.click(await screen.findByRole('button', { name: 'Pay with credit card' }));
  const dialog = await screen.findByRole('dialog');
  for (const label of [...DELIVERY_FIELDS, 'Número de tarjeta', 'CVC', 'Nombre en la tarjeta'])
    expect(within(dialog).getByLabelText(label)).toHaveValue('');
};

describe('clearing the checkout after a purchase (spec 011, real persisted store)', () => {
  let status: 'APPROVED' | 'DECLINED';
  beforeEach(() => {
    window.localStorage.clear();
    getJson.mockReset().mockImplementation((url: string) =>
      Promise.resolve(url === '/products' ? [headphones] : quoteFor(1)),
    );
    postJson.mockReset().mockImplementation((path: string) =>
      Promise.resolve(path === '/customers' ? { id: 'c1' } : aTransaction({ status })),
    );
  });

  it('AC-011-02 AC-011-03 after APPROVED and Volver a la tienda, localStorage keeps no delivery, card or transaction and a new purchase starts empty, also after a reload', async () => {
    status = 'APPROVED';
    const first = await boot();
    await buyWith('4242424242424242');
    await screen.findByRole('heading', { name: '¡Pago aprobado!' });
    expect(await first.stored()).toContain('José Pérez'); // persisted while the flow was running

    await userEvent.click(screen.getByRole('button', { name: 'Volver a la tienda' }));
    const stored = await first.stored();
    for (const value of [...Object.values(DELIVERY), 'TX-7a1d2c3a', aTransaction().id, '4242', 'VISA'])
      expect(stored).not.toContain(value);
    expect(first.store.getState().checkout.step).toBe('product');

    await expectEmptyModal();

    // Reload: a fresh store rehydrated from the same localStorage also starts empty.
    first.unmount();
    await boot();
    await expectEmptyModal();
  });

  it('AC-011-05 after DECLINED and Volver a la tienda, the delivery data stays (state and localStorage) for the next purchase', async () => {
    status = 'DECLINED';
    const { stored } = await boot();
    await buyWith('4111111111111111');
    await screen.findByRole('heading', { name: 'Pago rechazado' });
    await userEvent.click(screen.getByRole('button', { name: 'Volver a la tienda' }));

    const persisted = await stored();
    expect(persisted).toContain('José Pérez');
    expect(persisted).not.toContain('TX-7a1d2c3a');
    await userEvent.click(await screen.findByRole('button', { name: 'Pay with credit card' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByLabelText('Nombre completo')).toHaveValue('José Pérez');
    expect(within(dialog).getByLabelText('Número de tarjeta')).toHaveValue('');
  });
});
