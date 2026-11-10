import { checkoutReducer, goToStep, initialCheckoutState, resetCheckout } from './checkoutSlice';

describe('checkoutSlice', () => {
  it('starts on the product step', () => {
    expect(checkoutReducer(undefined, { type: '@@init' })).toEqual(initialCheckoutState);
  });

  it('moves between steps and resets', () => {
    const s = checkoutReducer(initialCheckoutState, goToStep('summary'));
    expect(s.step).toBe('summary');
    expect(checkoutReducer(s, resetCheckout()).step).toBe('product');
  });
});
