import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type CheckoutStep = 'product' | 'details' | 'summary' | 'result';

export interface CheckoutState {
  step: CheckoutStep;
  productId: string | null;
  quantity: number;
}

export const initialCheckoutState: CheckoutState = { step: 'product', productId: null, quantity: 1 };

const checkoutSlice = createSlice({
  name: 'checkout',
  initialState: initialCheckoutState,
  reducers: {
    startCheckout(state, action: PayloadAction<{ productId: string }>) {
      state.productId = action.payload.productId;
      state.quantity = 1;
      state.step = 'details';
    },
    goToStep(state, action: PayloadAction<CheckoutStep>) {
      state.step = action.payload;
    },
    resetCheckout: () => initialCheckoutState,
  },
});

export const { startCheckout, goToStep, resetCheckout } = checkoutSlice.actions;
export const checkoutReducer = checkoutSlice.reducer;
