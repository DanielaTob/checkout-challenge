import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { formatCop } from '../../shared/utils/money';
import { goToStep, resetCheckout } from '../checkout/checkoutSlice';
import { fetchProducts } from '../product/productsSlice';
import { pollTransaction, resetPayment } from './paymentSlice';
import type { Transaction } from './types';

export const POLL_INTERVAL_MS = 2000;
export const POLL_TIMEOUT_MS = 120000;

const FAILURE_TEXT: Record<string, string> = {
  OUT_OF_STOCK_AFTER_PAYMENT:
    'El producto se agotó mientras se procesaba tu pago. Contáctanos para gestionar la devolución.',
};

const rejectionText = (tx: Transaction) =>
  (tx.failureReason && FAILURE_TEXT[tx.failureReason]) ??
  'Tu banco o la pasarela rechazaron el pago. No se hizo ningún cobro.';

/** Screen 4: result of the payment. Polls while PENDING (every 2 s, up to 2 min). */
export function ResultScreen() {
  const dispatch = useAppDispatch();
  const transaction = useAppSelector((s) => s.payment.transaction);
  const delivery = useAppSelector((s) => s.checkout.delivery);
  const [timedOut, setTimedOut] = useState(false);
  const startedAt = useRef<number | null>(null);
  const pending = transaction?.status === 'PENDING';

  useEffect(() => {
    if (!pending || !transaction || timedOut) return;
    startedAt.current ??= Date.now();
    const timer = setInterval(() => {
      if (Date.now() - (startedAt.current ?? Date.now()) >= POLL_TIMEOUT_MS) {
        setTimedOut(true);
        return;
      }
      void dispatch(pollTransaction(transaction.id));
    }, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [dispatch, pending, transaction, timedOut]);

  const checkAgain = useCallback(() => {
    if (!transaction) return;
    startedAt.current = Date.now();
    setTimedOut(false);
    void dispatch(pollTransaction(transaction.id));
  }, [dispatch, transaction]);

  const backToShop = () => {
    dispatch(resetPayment());
    dispatch(resetCheckout({ keepDelivery: delivery }));
    void dispatch(fetchProducts());
  };

  const tryAgain = () => {
    dispatch(resetPayment());
    dispatch(goToStep('details'));
  };

  if (!transaction) return null;

  if (pending) {
    return (
      <section className="result result--pending" role="status" aria-live="polite">
        <span className="result__icon result__icon--pending" aria-hidden="true" />
        <h2 className="result__title">Procesando pago</h2>
        {timedOut ? (
          <>
            <p>Seguimos procesando tu pago</p>
            <button type="button" className="button button--secondary button--block" onClick={checkAgain}>
              Consultar de nuevo
            </button>
          </>
        ) : (
          <p>Estamos confirmando el pago con la pasarela. No cierres esta página.</p>
        )}
        <p className="result__muted">Referencia {transaction.reference}</p>
      </section>
    );
  }

  if (transaction.status === 'APPROVED') {
    return (
      <section className="result result--approved">
        <div role="status">
          <span className="result__icon result__icon--ok" aria-hidden="true">
            ✓
          </span>
          <h2 className="result__title">¡Pago aprobado!</h2>
        </div>
        <dl className="result__details">
          <div>
            <dt>Referencia</dt>
            <dd>{transaction.reference}</dd>
          </div>
          <div>
            <dt>Total pagado</dt>
            <dd data-testid="result-total">{formatCop(transaction.totalInCents)}</dd>
          </div>
          {transaction.cardBrand && transaction.cardLast4 && (
            <div>
              <dt>Tarjeta</dt>
              <dd>{`${transaction.cardBrand} •••• ${transaction.cardLast4}`}</dd>
            </div>
          )}
        </dl>
        <p className="result__muted">Te enviaremos el pedido a la dirección indicada.</p>
        <button type="button" className="button button--primary button--block" onClick={backToShop}>
          Volver a la tienda
        </button>
      </section>
    );
  }

  return (
    <section className="result result--rejected">
      <span className="result__icon result__icon--error" aria-hidden="true">
        ✕
      </span>
      <h2 className="result__title">Pago rechazado</h2>
      <p className="notice notice--error" role="alert">
        {rejectionText(transaction)}
      </p>
      <p className="result__muted">Referencia {transaction.reference}</p>
      <button type="button" className="button button--primary button--block" onClick={tryAgain}>
        Intentar de nuevo
      </button>
      <button type="button" className="button button--text button--block" onClick={backToShop}>
        Volver a la tienda
      </button>
    </section>
  );
}
