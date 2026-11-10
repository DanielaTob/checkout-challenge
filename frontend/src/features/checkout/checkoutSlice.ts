import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type CheckoutStep = 'product' | 'details' | 'summary' | 'result';

export interface CheckoutState {
  step: CheckoutStep;
}

export const initialCheckoutState: CheckoutState = { step: 'product' };

const checkoutSlice = createSlice({
  name: 'checkout',
  initialState: initialCheckoutState,
  reducers: {
    goToStep(state, action: PayloadAction<CheckoutStep>) {
      state.step = action.payload;
    },
    resetCheckout: () => initialCheckoutState,
  },
});

export const { goToStep, resetCheckout } = checkoutSlice.actions;
export const checkoutReducer = checkoutSlice.reducer;
