import { persistConfig, rootReducer } from '../../app/store';
import { emptyDelivery } from '../../shared/utils/delivery';
import { cardSessionReducer, setCardSession } from './cardSessionSlice';
import { closeCheckout, resetCheckout, saveDetails } from './checkoutSlice';

const delivery = { ...emptyDelivery, fullName: 'José Pérez', email: 'jose@example.com' };
const card = { number: '4242424242424242', expiry: '08/29', cvc: '123', holderName: 'Jose Perez' };

describe('card data split (sensitive vs persisted)', () => {
  it('AC-002-09 the cardSession slice is never persisted', () => {
    expect(persistConfig.whitelist).toEqual(['checkout']);
    expect(persistConfig.whitelist).not.toContain('cardSession');
  });

  it('AC-002-09 saveDetails keeps only brand + last4 and delivery in the persisted checkout slice', () => {
    let state = rootReducer(undefined, setCardSession(card));
    state = rootReducer(state, saveDetails({ delivery, card: { brand: 'VISA', last4: '4242' } }));

    expect(state.checkout).toMatchObject({ step: 'summary', delivery, card: { brand: 'VISA', last4: '4242' } });
    const persisted = JSON.stringify(state.checkout);
    expect(persisted).not.toContain('4242424242424242');
    expect(persisted).not.toContain('"123"');
    expect(persisted).not.toContain('08/29');
    expect(state.cardSession).toEqual(card); // still available in memory for the payment
  });

  it('AC-002-09 closing the checkout keeps delivery data but wipes all card data', () => {
    let state = rootReducer(undefined, setCardSession(card));
    state = rootReducer(state, saveDetails({ delivery, card: { brand: 'VISA', last4: '4242' } }));
    state = rootReducer(state, closeCheckout());
    expect(state.checkout).toMatchObject({ step: 'product', delivery, card: null });
    expect(state.cardSession).toBeNull();
  });

  it('AC-002-09 resetting the checkout wipes the in-memory card', () => {
    expect(cardSessionReducer(card, resetCheckout())).toBeNull();
  });
});
