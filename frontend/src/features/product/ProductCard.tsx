import { formatCop } from '../../shared/utils/money';
import { ProductImage } from './ProductImage';
import type { Product } from './types';

interface Props {
  product: Product;
  onPay: (product: Product) => void;
  priority?: boolean;
}

export function ProductCard({ product, onPay, priority = false }: Props) {
  const soldOut = product.stock <= 0;
  const titleId = `product-${product.id}-name`;
  return (
    <article className="product-card" aria-labelledby={titleId}>
      <ProductImage src={product.imageUrl} alt={product.name} priority={priority} />
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
