import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import type { RootState } from '../../app/store';
import { ApiError, getJson, postJson } from '../../shared/api/http';
import { onlyDigits } from '../../shared/utils/card';
import { parseExpiry } from '../../shared/utils/cardFields';
import { uuid } from '../../shared/utils/uuid';
import { clearCardSession } from '../checkout/cardSessionSlice';
import { goToStep, requireCardAgain } from '../checkout/checkoutSlice';
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

export const payTransaction = createAsyncThunk<
  Transaction,
  void,
  { state: RootState; rejectValue: string; pendingMeta: { idempotencyKey: string } }
>(
  'payment/pay',
  async (_, { getState, dispatch, rejectWithValue }) => {
    const { checkout, cardSession, payment } = getState();
    const expiry = cardSession ? parseExpiry(cardSession.expiry) : null;
    if (!cardSession || !expiry || !checkout.productId) {
      return rejectWithValue('Por seguridad, vuelve a ingresar los datos de tu tarjeta');
    }
    const key = payment.idempotencyKey as string; // set by the pending action (see getPendingMeta)
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
  {
    // Double-tap guard: a payment already in flight is never sent twice.
    condition: (_, { getState }) => getState().payment.status !== 'paying',
    // The key travels in the synchronous `pending` action, so it is persisted *before* any request:
    // if the page reloads mid-payment, the app can look the payment up by this key (no double charge).
    getPendingMeta: (_, { getState }) => ({ idempotencyKey: getState().payment.idempotencyKey ?? uuid() }),
  },
);

/** After a reload during a payment: find it by its key instead of paying again. */
export const recoverPayment = createAsyncThunk<Transaction, string, { rejectValue: 'NOT_FOUND' | 'UNKNOWN' }>(
  'payment/recover',
  async (key, { dispatch, signal, rejectWithValue }) => {
    try {
      const transaction = await getJson<Transaction>(`/transactions/by-key/${key}`, signal);
      dispatch(goToStep('result'));
      return transaction;
    } catch (e) {
      dispatch(requireCardAgain());
      return rejectWithValue(e instanceof ApiError && e.status === 404 ? 'NOT_FOUND' : 'UNKNOWN');
    }
  },
);

/** Refreshes a transaction; the backend re-queries the gateway while it is PENDING. */
export const pollTransaction = createAsyncThunk<Transaction, string>('payment/poll', (id, { signal }) =>
  getJson<Transaction>(`/transactions/${id}`, signal),
);

const paymentSlice = createSlice({
  name: 'payment',
  initialState: initialPaymentState,
  reducers: {
    resetPayment: () => initialPaymentState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(payTransaction.pending, (state, action) => {
        state.idempotencyKey = action.meta.idempotencyKey;
        state.status = 'paying';
        state.error = null;
      })
      .addCase(payTransaction.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.transaction = action.payload;
      })
      .addCase(recoverPayment.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.transaction = action.payload;
      })
      // Not found or unknown: keep the same key (a retry stays idempotent) and unblock the button.
      .addCase(recoverPayment.rejected, (state) => {
        state.status = 'idle';
      })
      .addCase(pollTransaction.fulfilled, (state, action) => {
        state.transaction = action.payload;
      })
      // pollTransaction.rejected: keep the last known transaction; the screen polls again.
      .addCase(payTransaction.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload ?? 'No pudimos procesar el pago. Intenta de nuevo.';
      });
  },
});

export const { resetPayment } = paymentSlice.actions;
export const paymentReducer = paymentSlice.reducer;
