import { createAsyncThunk } from '@reduxjs/toolkit';
import { requireCardAgain } from '../features/checkout/checkoutSlice';
import type { RootState } from './store';

/**
 * Runs once when the app starts (after redux-persist rehydrated) and fixes up the step:
 * - summary without the in-memory card → back to the modal asking for the card again.
 * - details / result need nothing: the modal reopens with delivery data, and the result
 *   screen resumes polling a PENDING transaction by itself.
 */
export const resumeAfterReload = createAsyncThunk<void, void, { state: RootState }>(
  'app/resumeAfterReload',
  (_, { getState, dispatch }) => {
    const { checkout, cardSession } = getState();
    if (checkout.step === 'summary' && !cardSession) dispatch(requireCardAgain());
  },
);
