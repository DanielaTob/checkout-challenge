import { useEffect, useId, useRef } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { formatCop } from "../../shared/utils/money";
import { ProductImage } from "../product/ProductImage";
import { goToStep, setQuantity } from "../checkout/checkoutSlice";
import { MaskedCard } from "./MaskedCard";
import { QuantityStepper } from "./QuantityStepper";
import { payTransaction } from "./paymentSlice";
import { fetchQuote } from "./quoteSlice";
import "./payment.css";

/**
 * Screen 3 in two fixed layers, inspired by the Material Backdrop (spec 009 rev. 2, ADR 0006):
 * - back layer: product, quantity and "Editar datos" (the controls that change the order);
 * - front layer: "Resumen del pedido" with the backend breakdown, the masked card and Pagar.
 * Both layers are always visible: no collapse/expand toggle and no scrim.
 * Same data flow as before (quote, quantity, edit, pay); only the presentation changed.
 */
export function SummaryBackdrop() {
  const dispatch = useAppDispatch();
  const titleId = useId();
  const { productId, quantity, card } = useAppSelector((s) => s.checkout);
  const product = useAppSelector((s) =>
    s.products.items.find((p) => p.id === productId),
  );
  const quote = useAppSelector((s) => s.quote);
  const payment = useAppSelector((s) => s.payment);
  const paying = payment.status === "paying";
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (!productId) return;
    const request = dispatch(fetchQuote({ productId, quantity }));
    return () => request.abort();
  }, [dispatch, productId, quantity]);

  // Entering the step moves focus to the summary heading, so screen readers announce it.
  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  const retry = () =>
    productId && void dispatch(fetchQuote({ productId, quantity }));
  const ready = quote.status === "succeeded" && quote.data !== null;

  return (
    <div className="backdrop">
      <div className="backdrop__back">
        {product && (
          <div className="backdrop__product">
            <div className="backdrop__media">
              <ProductImage
                src={product.imageUrl}
                alt={product.name}
                priority
              />
            </div>
            <div className="backdrop__product-info">
              <p className="backdrop__product-name">{product.name}</p>
              <p className="backdrop__unit-price">
                {formatCop(product.priceInCents)} c/u
              </p>
              <p className="backdrop__description">{product.description}</p>
            </div>
          </div>
        )}
        <div className="backdrop__controls">
          {product && (
            <QuantityStepper
              value={quantity}
              max={product.stock}
              disabled={paying}
              onChange={(q) => dispatch(setQuantity(q))}
            />
          )}
          <button
            type="button"
            className="button button--secondary"
            disabled={paying}
            onClick={() => dispatch(goToStep("details"))}
          >
            Editar datos
          </button>
        </div>
      </div>

      <section className="backdrop__front" aria-labelledby={titleId}>
        <h2
          className="backdrop__subheader"
          id={titleId}
          ref={titleRef}
          tabIndex={-1}
        >
          Resumen del pedido
        </h2>

        {quote.status === "failed" ? (
          <div className="notice notice--error" role="alert">
            <p>{quote.error}</p>
            {!quote.outOfStock && (
              <button
                type="button"
                className="button button--secondary"
                onClick={retry}
              >
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
          <div
            className="breakdown breakdown--loading"
            role="status"
            aria-label="Calculando total"
          >
            <div className="skeleton skeleton--text" />
            <div className="skeleton skeleton--text" />
            <div className="skeleton skeleton--title" />
          </div>
        )}

        <div className="backdrop__pay">
          {card && (
            <p className="backdrop__card">
              <MaskedCard card={card} />
            </p>
          )}

          {payment.status === "failed" && payment.error && (
            <p className="notice notice--error" role="alert">
              {payment.error}
            </p>
          )}

          <button
            type="button"
            className="button button--primary button--block"
            disabled={!ready || paying}
            aria-busy={paying ? "true" : "false"}
            onClick={() => void dispatch(payTransaction())}
          >
            {paying ? (
              <>
                <span className="spinner" aria-hidden="true" /> Procesando
                pago…
              </>
            ) : ready && quote.data ? (
              `Pagar ${formatCop(quote.data.totalInCents)}`
            ) : (
              "Pagar"
            )}
          </button>
        </div>
      </section>
    </div>
  );
}
