import { formatCop } from '../../shared/utils/money';
import type { Product } from './types';

interface Props {
  product: Product;
  onPay: (product: Product) => void;
}

export function ProductCard({ product, onPay }: Props) {
  const soldOut = product.stock <= 0;
  const titleId = `product-${product.id}-name`;
  return (
    <article className="product-card" aria-labelledby={titleId}>
      <img className="product-card__image" src={product.imageUrl} alt={product.name} />
      <div className="product-card__body">
        <h2 id={titleId} className="product-card__name">
          {product.name}
        </h2>
        <p className="product-card__description">{product.description}</p>
        <div className="product-card__meta">
          <span className="product-card__price" data-testid="price">
            {formatCop(product.priceInCents)}
          </span>
          <span className={soldOut ? 'product-card__stock product-card__stock--out' : 'product-card__stock'}>
            {soldOut ? 'Agotado' : `${product.stock} disponibles`}
          </span>
        </div>
        <button type="button" className="button button--primary" disabled={soldOut} onClick={() => onPay(product)}>
          Pay with credit card
        </button>
      </div>
    </article>
  );
}
