import { useEffect, useState } from 'react';
import { formatCop } from '../../shared/utils/money';
import { ProductImage } from './ProductImage';
import type { Product } from './types';

export const LOW_STOCK = 5;
const HIGHLIGHT_MS = 2400;

interface Props {
  product: Product;
  onPay: (product: Product) => void;
  priority?: boolean;
}

export function ProductCard({ product, onPay, priority = false }: Props) {
  // Screen 5: when the stock changes (e.g. after a purchase) the card is softly highlighted.
  const [prevStock, setPrevStock] = useState(product.stock);
  const [updated, setUpdated] = useState(false);
  if (prevStock !== product.stock) {
    setPrevStock(product.stock);
    setUpdated(true);
  }
  useEffect(() => {
    if (!updated) return;
    const timer = setTimeout(() => setUpdated(false), HIGHLIGHT_MS);
    return () => clearTimeout(timer);
  }, [updated, product.stock]);

  const soldOut = product.stock <= 0;
  const low = !soldOut && product.stock <= LOW_STOCK;
  const titleId = `product-${product.id}-name`;
  const badgeClass = ['badge', soldOut && 'badge--out', low && 'badge--low'].filter(Boolean).join(' ');
  return (
    <article className={updated ? 'product-card product-card--updated' : 'product-card'} aria-labelledby={titleId}>
      <div className="product-card__media">
        <ProductImage src={product.imageUrl} alt={product.name} priority={priority} />
        <span className={`product-card__stock ${badgeClass}`}>{soldOut ? 'Agotado' : `Quedan ${product.stock}`}</span>
      </div>
      <div className="product-card__body">
        <h2 id={titleId} className="product-card__name">
          {product.name}
        </h2>
        <p className="product-card__description">{product.description}</p>
        <p className="product-card__price" data-testid="price">
          {formatCop(product.priceInCents)}
        </p>
        {updated && (
          <p className="visually-hidden" role="status">
            {soldOut ? 'Stock actualizado: agotado' : `Stock actualizado: quedan ${product.stock}`}
          </p>
        )}
        <button type="button" className="button button--primary button--block" disabled={soldOut} onClick={() => onPay(product)}>
          Pay with credit card
        </button>
      </div>
    </article>
  );
}
