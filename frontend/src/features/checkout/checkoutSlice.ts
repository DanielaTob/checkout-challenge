import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { CardBrand } from '../../shared/utils/brand';
import { emptyDelivery, type DeliveryForm } from '../../shared/utils/delivery';

export type CheckoutStep = 'product' | 'details' | 'summary' | 'result';

/** Only non-sensitive card data. The full number, expiry and CVC live in cardSession (memory only). */
export interface CardSummary {
  brand: CardBrand;
  last4: string;
}

export interface CheckoutState {
  step: CheckoutStep;
  productId: string | null;
  quantity: number;
  delivery: DeliveryForm;
  card: CardSummary | null;
  /** One-off message shown in the modal (e.g. card lost after a reload). */
  notice?: string | null;
}

export const initialCheckoutState: CheckoutState = {
  step: 'product',
  productId: null,
  quantity: 1,
  delivery: emptyDelivery,
  card: null,
};

const checkoutSlice = createSlice({
  name: 'checkout',
  initialState: initialCheckoutState,
  reducers: {
    startCheckout(state, action: PayloadAction<{ productId: string }>) {
      state.productId = action.payload.productId;
      state.quantity = 1;
      state.step = 'details';
    },
    /** The full card only lives in memory: after a reload it must be typed again. */
    requireCardAgain(state) {
      state.step = 'details';
      state.card = null;
      state.notice = 'Por seguridad, vuelve a ingresar los datos de tu tarjeta';
    },
    saveDetails(state, action: PayloadAction<{ delivery: DeliveryForm; card: CardSummary }>) {
      state.notice = null;
      state.delivery = action.payload.delivery;
      state.card = action.payload.card;
      state.step = 'summary';
    },
    /** Leaves the modal: delivery data (also the draft being typed) is kept, card data is dropped. */
    closeCheckout(state, action: PayloadAction<{ delivery?: DeliveryForm } | undefined>) {
      if (action.payload?.delivery) state.delivery = action.payload.delivery;
      state.notice = null;
      state.step = 'product';
      state.card = null;
    },
    setQuantity(state, action: PayloadAction<number>) {
      state.quantity = action.payload;
    },
    goToStep(state, action: PayloadAction<CheckoutStep>) {
      state.step = action.payload;
    },
    /** Back to the shop: clears the flow; optionally keeps the delivery data for the next purchase. */
    resetCheckout: (_state, action: PayloadAction<{ keepDelivery?: DeliveryForm } | undefined>) => ({
      ...initialCheckoutState,
      delivery: action.payload?.keepDelivery ?? initialCheckoutState.delivery,
    }),
  },
});

export const { startCheckout, requireCardAgain, saveDetails, closeCheckout, setQuantity, goToStep, resetCheckout } =
  checkoutSlice.actions;
export const checkoutReducer = checkoutSlice.reducer;
