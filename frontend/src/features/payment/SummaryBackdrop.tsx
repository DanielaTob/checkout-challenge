import { useEffect, useId, useRef, useState } from "react";
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
 * Screen 3, Material Backdrop (m2.material.io/components/backdrop):
 * - back layer: product, quantity and "Editar datos" (the controls that change the front layer);
 * - front layer: "Resumen del pedido" with the backend breakdown, the masked card and Pagar.
 * Only one layer is active: the subheader button lowers/raises the front layer.
 * Same data flow as before (quote, quantity, edit, pay); only the presentation changed.
 */
export function SummaryBackdrop() {
  const dispatch = useAppDispatch();
  const ids = { back: useId(), front: useId(), title: useId() };
  const { productId, quantity, card } = useAppSelector((s) => s.checkout);
  const product = useAppSelector((s) =>
    s.products.items.find((p) => p.id === productId),
  );
  const quote = useAppSelector((s) => s.quote);
  const payment = useAppSelector((s) => s.payment);
  const paying = payment.status === "paying";

  const [frontActive, setFrontActive] = useState(true);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const backControlsRef = useRef<HTMLDivElement>(null);
  const mounted = useRef(false);

  useEffect(() => {
    if (!productId) return;
    const request = dispatch(fetchQuote({ productId, quantity }));
    return () => request.abort();
  }, [dispatch, productId, quantity]);

  // Focus follows the active layer: the toggle on entry and when the front layer comes back,
  // the first back-layer control when it is revealed.
  useEffect(() => {
    if (frontActive || !mounted.current) toggleRef.current?.focus();
    else
      backControlsRef.current
        ?.querySelector<HTMLElement>("button:not(:disabled)")
        ?.focus();
    mounted.current = true;
  }, [frontActive]);

  // Esc while the back layer is active brings the front layer back.
  useEffect(() => {
    if (frontActive) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFrontActive(true);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [frontActive]);

  const retry = () =>
    productId && void dispatch(fetchQuote({ productId, quantity }));
  const ready = quote.status === "succeeded" && quote.data !== null;
  const toggle = () => setFrontActive((active) => !active);

  return (
    <div className="backdrop" data-active={frontActive ? "front" : "back"}>
      <div className="backdrop__back" id={ids.back}>
        {product && (
          <div className="backdrop__product">
            <div className="backdrop__media">
              <ProductImage src={product.imageUrl} alt={product.name} priority />
            </div>
            <div className="backdrop__product-info">
              <p className="backdrop__product-name">{product.name}</p>
              <p className="backdrop__unit-price">
                {formatCop(product.priceInCents)} c/u
              </p>
              {frontActive ? (
                <p className="backdrop__quantity">Cantidad: {quantity}</p>
              ) : (
                <p className="backdrop__description">{product.description}</p>
              )}
            </div>
          </div>
        )}
        <div
          className="backdrop__controls"
          ref={backControlsRef}
          hidden={frontActive}
        >
          {product && (
            <QuantityStepper
              value={quantity}
              max={product.stock}
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

      <section className="backdrop__front" aria-labelledby={ids.title}>
        <h2 className="backdrop__subheader">
          <button
            ref={toggleRef}
            type="button"
            className="backdrop__toggle"
            aria-expanded={frontActive}
            aria-controls={`${ids.front} ${ids.back}`}
            disabled={paying}
            onClick={toggle}
          >
            <span className="backdrop__toggle-label" id={ids.title}>
              Resumen del pedido
            </span>
            {!frontActive && ready && quote.data && (
              <span className="backdrop__toggle-total">
                {formatCop(quote.data.totalInCents)}
              </span>
            )}
            <span className="backdrop__chevron" aria-hidden="true" />
          </button>
        </h2>

        <div className="backdrop__front-body" id={ids.front} hidden={!frontActive}>
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
        </div>

        {!frontActive && (
          <div
            className="backdrop__scrim"
            aria-hidden="true"
            onClick={() => setFrontActive(true)}
          />
        )}
      </section>
    </div>
  );
}
