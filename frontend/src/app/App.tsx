import { useEffect } from 'react';
import { CheckoutDetails } from '../features/checkout/CheckoutDetails';
import { startCheckout } from '../features/checkout/checkoutSlice';
import { ResultScreen } from '../features/payment/ResultScreen';
import { SummarySheet } from '../features/payment/SummarySheet';
import { ProductList } from '../features/product/ProductList';
import { CheckoutProgress } from './CheckoutProgress';
import { useAppDispatch, useAppSelector } from './hooks';
import { resumeAfterReload } from './resumeAfterReload';
import './app.css';

export const STORE_NAME = 'Tienda Demo';

export function App() {
  const dispatch = useAppDispatch();
  const step = useAppSelector((s) => s.checkout.step);

  useEffect(() => {
    void dispatch(resumeAfterReload());
  }, [dispatch]);

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-header__brand">
          <span className="app-header__logo" aria-hidden="true">
            ◆
          </span>
          {STORE_NAME}
        </h1>
        <span className="app-header__tag">Pago seguro</span>
      </header>
      <CheckoutProgress step={step} />
      <main className="app__main" data-step={step}>
        {step === 'result' ? (
          <ResultScreen />
        ) : (
          <ProductList onPay={(product) => dispatch(startCheckout({ productId: product.id }))} />
        )}
      </main>
      {step === 'details' && <CheckoutDetails />}
      {step === 'summary' && <SummarySheet />}
    </div>
  );
}
