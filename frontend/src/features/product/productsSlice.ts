import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { ApiError, getJson } from '../../shared/api/http';
import type { Product } from './types';

export interface ProductsState {
  items: Product[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error: string | null;
}

const initialState: ProductsState = { items: [], status: 'idle', error: null };

/** Products and stock are always fetched fresh from the API (this slice is never persisted). */
export const fetchProducts = createAsyncThunk<Product[], void, { rejectValue: string }>(
  'products/fetch',
  async (_, { signal, rejectWithValue }) => {
    try {
      return await getJson<Product[]>('/products', signal);
    } catch (e) {
      return rejectWithValue(e instanceof ApiError ? e.message : 'No pudimos cargar los productos');
    }
  },
);

const productsSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchProducts.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchProducts.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload ?? 'No pudimos cargar los productos';
      });
  },
});

export const productsReducer = productsSlice.reducer;
