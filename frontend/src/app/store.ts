import { combineReducers, configureStore } from '@reduxjs/toolkit';
import {
  FLUSH,
  PAUSE,
  PERSIST,
  persistReducer,
  persistStore,
  PURGE,
  REGISTER,
  REHYDRATE,
} from 'redux-persist';
import { cardSessionReducer } from '../features/checkout/cardSessionSlice';
import { checkoutReducer } from '../features/checkout/checkoutSlice';
import { quoteReducer } from '../features/payment/quoteSlice';
import { productsReducer } from '../features/product/productsSlice';
import { createLocalStorage } from './storage';

export const rootReducer = combineReducers({
  checkout: checkoutReducer,
  cardSession: cardSessionReducer,
  products: productsReducer,
  quote: quoteReducer,
});

// Only whitelisted slices are persisted. Card number and CVC must never reach any slice
// that is persisted (see spec 005); they live only in component state.
export const persistConfig = {
  key: 'checkout-app',
  version: 1,
  storage: createLocalStorage(),
  whitelist: ['checkout'],
};

export const makeStore = () => {
  const store = configureStore({
    reducer: persistReducer(persistConfig, rootReducer),
    middleware: (getDefault) =>
      getDefault({ serializableCheck: { ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER] } }),
  });
  return { store, persistor: persistStore(store) };
};

export type RootState = ReturnType<typeof rootReducer>;
export type AppStore = ReturnType<typeof makeStore>['store'];
export type AppDispatch = AppStore['dispatch'];
