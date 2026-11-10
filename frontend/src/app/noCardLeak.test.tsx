import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { aTransaction, headphones, quoteFor } from '../test/fixtures';
import { bootPersistedStore } from '../test/persist';
import { App } from './App';

jest.mock('../shared/api/http', () => ({
  ...jest.requireActual<typeof import('../shared/api/http')>('../shared/api/http'),
  getJson: jest.fn(),
  postJson: jest.fn(),
}));
const { getJson, postJson } = jest.requireMock<{ getJson: jest.Mock; postJson: jest.Mock }>('../shared/api/http');

const SENSITIVE = [/4242\s?4242\s?4242\s?4242/, /"?cvc"?\s*[:=]/i, /\b987\b/, /08\/29|"expiry"|expMonth|expYear/];

describe('no card data in localStorage across the whole flow', () => {
  beforeEach(() => {
    window.localStorage.clear();
    getJson.mockReset().mockImplementation((url: string) =>
      Promise.resolve(url === '/products' ? [headphones] : quoteFor(1)),
    );
    postJson.mockReset().mockImplementation((path: string) =>
      Promise.resolve(path === '/customers' ? { id: 'c1' } : aTransaction()),
    );
  });

  it('AC-005-06 never stores the full number, CVC or expiry at any step', async () => {
    const { store, persistor } = await bootPersistedStore();
    render(
      <Provider store={store}>
        <App />
      </Provider>,
    );
    const snapshots: string[] = [];
    const snap = async (label: string) => {
      await persistor.flush();
      snapshots.push(`${label}: ${JSON.stringify(window.localStorage)}`);
    };

    await userEvent.click(await screen.findByRole('button', { name: 'Pay with credit card' }));
    const type = (label: string, value: string) => userEvent.type(screen.getByLabelText(label), value);
    await type('Número de tarjeta', '4242424242424242');
    await type('Vencimiento (MM/AA)', '0829');
    await type('CVC', '987');
    await type('Nombre en la tarjeta', 'Jose Perez');
    await snap('modal with card typed');
    await type('Nombre completo', 'José Pérez');
    await type('Email', 'jose@example.com');
    await type('Teléfono', '3001234567');
    await type('Dirección', 'Calle 10 # 20-30');
    await type('Ciudad', 'Medellín');
    await type('Departamento', 'Antioquia');
    await type('Código postal', '050021');
    await userEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    await screen.findByText('Total', { exact: true });
    await snap('summary');
    await userEvent.click(screen.getByRole('button', { name: /Pagar/ }));
    await screen.findByRole('heading', { name: '¡Pago aprobado!' });
    await snap('result');
    await userEvent.click(screen.getByRole('button', { name: 'Volver a la tienda' }));
    await snap('back to shop');

    expect(snapshots).toHaveLength(4);
    for (const s of snapshots) for (const pattern of SENSITIVE) expect(s).not.toMatch(pattern);
    // The non-sensitive parts are there (brand + last 4 were persisted during the flow).
    expect(snapshots[1]).toContain('4242');
    expect(snapshots[1]).toContain('VISA');
  });
});
