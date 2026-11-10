import { useEffect, useId } from 'react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { formatCop } from '../../shared/utils/money';
import { ProductImage } from '../product/ProductImage';
import { MaskedCard } from './MaskedCard';
import { fetchQuote } from './quoteSlice';
import './payment.css';

/** Screen 3: Material-style bottom sheet over a dimmed backdrop with the backend breakdown. */
export function SummarySheet() {
  const dispatch = useAppDispatch();
  const titleId = useId();
  const { productId, quantity, card } = useAppSelector((s) => s.checkout);
  const product = useAppSelector((s) => s.products.items.find((p) => p.id === productId));
  const quote = useAppSelector((s) => s.quote);

  useEffect(() => {
    if (!productId) return;
    const request = dispatch(fetchQuote({ productId, quantity }));
    return () => request.abort();
  }, [dispatch, productId, quantity]);

  const retry = () => productId && void dispatch(fetchQuote({ productId, quantity }));
  const ready = quote.status === 'succeeded' && quote.data !== null;

  return (
    <div className="sheet-backdrop">
      <section className="sheet" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="sheet__handle" aria-hidden="true" />
        <h2 id={titleId} className="sheet__title">
          Resumen del pago
        </h2>

        {product && (
          <div className="sheet__product">
            <ProductImage src={product.imageUrl} alt={product.name} priority />
            <div>
              <p className="sheet__product-name">{product.name}</p>
              <p className="sheet__muted">Cantidad: {quantity}</p>
            </div>
          </div>
        )}

        {quote.status === 'failed' ? (
          <div className="notice notice--error" role="alert">
            <p>{quote.error}</p>
            {!quote.outOfStock && (
              <button type="button" className="button button--secondary" onClick={retry}>
                Reintentar
              </button>
            )}
          </div>
        ) : ready && quote.data ? (
          <dl className="breakdown">
            <div className="breakdown__row">
              <dt>Subtotal</dt>
              <dd>{formatCop(quote.data.subtotalInCents)}</dd>
            </div>
            <div className="breakdown__row">
              <dt>Tarifa base</dt>
              <dd>{formatCop(quote.data.baseFeeInCents)}</dd>
            </div>
            <div className="breakdown__row">
              <dt>Envío</dt>
              <dd>{formatCop(quote.data.deliveryFeeInCents)}</dd>
            </div>
            <div className="breakdown__row breakdown__row--total">
              <dt>Total</dt>
              <dd>{formatCop(quote.data.totalInCents)}</dd>
            </div>
          </dl>
        ) : (
          <div className="breakdown breakdown--loading" role="status" aria-label="Calculando total">
            <div className="skeleton skeleton--text" />
            <div className="skeleton skeleton--text" />
            <div className="skeleton skeleton--title" />
          </div>
        )}

        {card && (
          <p className="sheet__card">
            <MaskedCard card={card} />
          </p>
        )}

        <button type="button" className="button button--primary button--block" disabled={!ready}>
          {ready && quote.data ? `Pagar ${formatCop(quote.data.totalInCents)}` : 'Pagar'}
        </button>
      </section>
    </div>
  );
}
