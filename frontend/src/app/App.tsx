import { useAppSelector } from './hooks';

export function App() {
  const step = useAppSelector((s) => s.checkout.step);
  return (
    <main className="app" data-step={step}>
      <h1 className="app__title">Checkout</h1>
    </main>
  );
}
