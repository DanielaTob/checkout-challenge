import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { closeCheckout, resetCheckout } from './checkoutSlice';

/**
 * Sensitive card data, kept ONLY in memory: this slice is outside the redux-persist
 * whitelist, so it never reaches localStorage and is lost on reload (by design).
 */
export interface CardSession {
  number: string;
  expiry: string;
  cvc: string;
  holderName: string;
}

const cardSessionSlice = createSlice({
  name: 'cardSession',
  initialState: null as CardSession | null,
  reducers: {
    setCardSession: (_state, action: PayloadAction<CardSession>) => action.payload,
    clearCardSession: () => null,
  },
  extraReducers: (builder) => {
    builder.addCase(closeCheckout, () => null).addCase(resetCheckout, () => null);
  },
});

export const { setCardSession, clearCardSession } = cardSessionSlice.actions;
export const cardSessionReducer = cardSessionSlice.reducer;
