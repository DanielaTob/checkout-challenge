import { configureStore } from '@reduxjs/toolkit';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { Provider } from 'react-redux';
import { rootReducer, type RootState } from '../app/store';

export const renderWithStore = (ui: ReactElement, preloadedState?: Partial<RootState>) => {
  const store = configureStore({ reducer: rootReducer, preloadedState });
  return { store, ...render(<Provider store={store}>{ui}</Provider>) };
};
