import { CheckoutDetails } from '../features/checkout/CheckoutDetails';
import { startCheckout } from '../features/checkout/checkoutSlice';
import { SummarySheet } from '../features/payment/SummarySheet';
import { ProductList } from '../features/product/ProductList';
import { useAppDispatch, useAppSelector } from './hooks';

export function App() {
  const dispatch = useAppDispatch();
  const step = useAppSelector((s) => s.checkout.step);
  return (
    <main className="app" data-step={step}>
      <h1 className="app__title">Checkout</h1>
      <ProductList onPay={(product) => dispatch(startCheckout({ productId: product.id }))} />
      {step === 'details' && <CheckoutDetails />}
      {step === 'summary' && <SummarySheet />}
    </main>
  );
}
