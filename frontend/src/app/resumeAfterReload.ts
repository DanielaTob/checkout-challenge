import { createAsyncThunk } from '@reduxjs/toolkit';
import { requireCardAgain } from '../features/checkout/checkoutSlice';
import { recoverPayment } from '../features/payment/paymentSlice';
import type { RootState } from './store';

/**
 * Runs once when the app starts (after redux-persist rehydrated) and fixes up the step:
 * - a payment was in flight → look it up by its persisted Idempotency-Key (never pay twice).
 * - summary without the in-memory card → back to the modal asking for the card again.
 * - details / result need nothing: the modal reopens with delivery data, and the result
 *   screen resumes polling a PENDING transaction by itself.
 */
export const resumeAfterReload = createAsyncThunk<void, void, { state: RootState }>(
  'app/resumeAfterReload',
  (_, { getState, dispatch }) => {
    const { checkout, cardSession, payment } = getState();
    if (payment.status === 'paying' && payment.idempotencyKey) {
      // The page was reloaded while a payment was in flight.
      void dispatch(recoverPayment(payment.idempotencyKey));
      return;
    }
    if (checkout.step === 'summary' && !cardSession) dispatch(requireCardAgain());
  },
);
