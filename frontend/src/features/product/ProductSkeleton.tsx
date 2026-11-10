export function ProductSkeleton() {
  return (
    <div className="product-card product-card--skeleton" aria-hidden="true">
      <div className="product-card__image skeleton" />
      <div className="product-card__body">
        <div className="skeleton skeleton--title" />
        <div className="skeleton skeleton--text" />
        <div className="skeleton skeleton--text skeleton--short" />
        <div className="skeleton skeleton--button" />
      </div>
    </div>
  );
}
