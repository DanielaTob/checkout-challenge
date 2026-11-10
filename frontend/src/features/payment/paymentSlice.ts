import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { RootState } from '../../app/store';
import { ApiError, postJson } from '../../shared/api/http';
import { onlyDigits } from '../../shared/utils/card';
import { parseExpiry } from '../../shared/utils/cardFields';
import { uuid } from '../../shared/utils/uuid';
import { clearCardSession } from '../checkout/cardSessionSlice';
import { goToStep } from '../checkout/checkoutSlice';
import type { Transaction } from './types';

export interface PaymentState {
  status: 'idle' | 'paying' | 'succeeded' | 'failed';
  /** Generated when the user taps Pagar; reused on retries so the gateway never charges twice. */
  idempotencyKey: string | null;
  transaction: Transaction | null;
  error: string | null;
}

export const initialPaymentState: PaymentState = { status: 'idle', idempotencyKey: null, transaction: null, error: null };

export const paymentErrorMessage = (e: unknown): string => {
  if (e instanceof ApiError) {
    if (e.status === 409) return 'Ya no hay stock suficiente para tu pedido';
    if (e.status === 400 || e.status === 422) return 'Revisa los datos de tu tarjeta';
    if (e.status === 0 || e.status >= 500) return 'La pasarela no respondió, no se hizo ningún cobro. Intenta de nuevo.';
  }
  return 'No pudimos procesar el pago. Intenta de nuevo.';
};

export const payTransaction = createAsyncThunk<Transaction, void, { state: RootState; rejectValue: string }>(
  'payment/pay',
  async (_, { getState, dispatch, rejectWithValue }) => {
    const { checkout, cardSession, payment } = getState();
    const expiry = cardSession ? parseExpiry(cardSession.expiry) : null;
    if (!cardSession || !expiry || !checkout.productId) {
      return rejectWithValue('Por seguridad, vuelve a ingresar los datos de tu tarjeta');
    }
    const key = payment.idempotencyKey ?? uuid();
    dispatch(paymentSlice.actions.keyAssigned(key));
    const { delivery } = checkout;
    try {
      const customer = await postJson<{ id: string }>('/customers', {
        fullName: delivery.fullName.trim(),
        email: delivery.email.trim(),
        phone: onlyDigits(delivery.phone),
      });
      const transaction = await postJson<Transaction>(
        '/transactions',
        {
          productId: checkout.productId,
          customerId: customer.id,
          quantity: checkout.quantity,
          shipping: {
            address: delivery.address.trim(),
            city: delivery.city.trim(),
            region: delivery.region.trim(),
            postalCode: delivery.postalCode.trim(),
          },
          card: {
            number: cardSession.number,
            cvc: cardSession.cvc,
            expMonth: expiry.month,
            expYear: expiry.year,
            holderName: cardSession.holderName,
          },
        },
        { 'Idempotency-Key': key },
      );
      dispatch(clearCardSession());
      dispatch(goToStep('result'));
      return transaction;
    } catch (e) {
      return rejectWithValue(paymentErrorMessage(e));
    }
  },
  // Double-tap guard: a payment already in flight is never sent twice.
  { condition: (_, { getState }) => getState().payment.status !== 'paying' },
);

const paymentSlice = createSlice({
  name: 'payment',
  initialState: initialPaymentState,
  reducers: {
    keyAssigned(state, action: { payload: string }) {
      state.idempotencyKey = action.payload;
    },
    resetPayment: () => initialPaymentState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(payTransaction.pending, (state) => {
        state.status = 'paying';
        state.error = null;
      })
      .addCase(payTransaction.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.transaction = action.payload;
      })
      .addCase(payTransaction.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload ?? 'No pudimos procesar el pago. Intenta de nuevo.';
      });
  },
});

export const { resetPayment } = paymentSlice.actions;
export const paymentReducer = paymentSlice.reducer;
