import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { ApiError, getJson } from '../../shared/api/http';
import type { Quote } from './types';

export interface QuoteState {
  data: Quote | null;
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
  outOfStock: boolean;
}

const initialState: QuoteState = { data: null, status: 'idle', error: null, outOfStock: false };

type QuoteFailure = { message: string; outOfStock: boolean };

/** The backend is the single source of truth for amounts (never computed in the browser). */
export const fetchQuote = createAsyncThunk<
  Quote,
  { productId: string; quantity: number },
  { rejectValue: QuoteFailure }
>('quote/fetch', async ({ productId, quantity }, { signal, rejectWithValue }) => {
  try {
    return await getJson<Quote>(`/products/${productId}/quote?quantity=${quantity}`, signal);
  } catch (e) {
    if (e instanceof ApiError && e.status === 409) {
      return rejectWithValue({ message: 'Ya no hay stock suficiente', outOfStock: true });
    }
    return rejectWithValue({ message: 'No pudimos calcular el total', outOfStock: false });
  }
});

const quoteSlice = createSlice({
  name: 'quote',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchQuote.pending, (state) => {
        state.status = 'loading';
        state.error = null;
        state.outOfStock = false;
      })
      .addCase(fetchQuote.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.data = action.payload;
      })
      .addCase(fetchQuote.rejected, (state, action) => {
        if (action.meta.aborted) return; // superseded by a newer quote request
        state.status = 'failed';
        state.data = null;
        state.error = action.payload?.message ?? 'No pudimos calcular el total';
        state.outOfStock = action.payload?.outOfStock ?? false;
      });
  },
});

export const quoteReducer = quoteSlice.reducer;
