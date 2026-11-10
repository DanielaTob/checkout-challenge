import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../app/hooks';
import { ProductCard } from './ProductCard';
import { ProductSkeleton } from './ProductSkeleton';
import { fetchProducts } from './productsSlice';
import type { Product } from './types';
import './product.css';

interface Props {
  onPay?: (product: Product) => void;
}

export function ProductList({ onPay = () => {} }: Props) {
  const dispatch = useAppDispatch();
  const { items, status } = useAppSelector((s) => s.products);

  useEffect(() => {
    if (status === 'idle') void dispatch(fetchProducts());
  }, [dispatch, status]);

  if (status === 'idle' || status === 'loading') {
    return (
      <div className="product-list" role="status" aria-busy="true" aria-label="Cargando productos">
        <ProductSkeleton />
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className="notice notice--error" role="alert">
        <p>No pudimos cargar los productos. Revisa tu conexión e inténtalo de nuevo.</p>
        <button type="button" className="button button--secondary" onClick={() => void dispatch(fetchProducts())}>
          Reintentar
        </button>
      </div>
    );
  }

  if (items.length === 0) return <p className="notice">No hay productos disponibles</p>;

  return (
    <ul className="product-list">
      {items.map((p) => (
        <li key={p.id}>
          <ProductCard product={p} onPay={onPay} />
        </li>
      ))}
    </ul>
  );
}
