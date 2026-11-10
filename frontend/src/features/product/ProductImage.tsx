import { useState } from 'react';

interface Props {
  src: string;
  alt: string;
  /** The first (above-the-fold) image loads eagerly with high priority; the rest lazily. */
  priority?: boolean;
}

// Intrinsic size of the WebP assets (4:3). Declaring it avoids layout shift while loading.
const WIDTH = 800;
const HEIGHT = 600;

export function ProductImage({ src, alt, priority = false }: Props) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return <div className="product-card__image product-card__image--placeholder" role="img" aria-label={alt} />;
  }

  return (
    <img
      className="product-card__image"
      src={src}
      alt={alt}
      width={WIDTH}
      height={HEIGHT}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}
