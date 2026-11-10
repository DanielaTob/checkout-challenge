# 001 · Plan

## Backend
- **Dominio** `domain/product/`
  - `product.ts`: tipo `Product` (inmutable).
  - `product.repository.ts`: puerto `ProductRepository { findAll(); findById(id): Promise<Product | null> }`.
- **Aplicación** `application/products/`
  - `list-products.use-case.ts` → `Result<Product[], DomainError>`.
  - `get-product.use-case.ts` → `Result<Product, DomainError>` con `NOT_FOUND`.
- **Infraestructura**
  - `prisma/prisma-product.repository.ts`: adaptador del puerto, mapea a dominio.
  - `http/products.controller.ts`: `ParseUUIDPipe` (→ 400), `unwrapOrThrow` (→ 404). DTO de respuesta `ProductResponseDto` con decoradores Swagger.
- Inyección: token `PRODUCT_REPOSITORY` (Symbol) en `ProductsModule`.
- Migración inicial de Prisma con las 4 tablas + seed con `upsert` (`update: {}`) para no tocar el stock.

## Frontend
- `shared/utils/money.ts`: `formatCop(cents)` con `Intl.NumberFormat('es-CO')`.
- `shared/api/http.ts`: `fetch` con base `VITE_API_URL` (inyectada en un módulo `config.ts` para poder mockearla en Jest).
- `features/product/productsSlice.ts`: `createAsyncThunk fetchProducts`, estados `idle|loading|succeeded|failed`. **No se persiste**.
- `features/product/ProductList.tsx`, `ProductCard.tsx`, `ProductSkeleton.tsx`.
- `features/checkout/checkoutSlice.ts`: acción `startCheckout({ productId })` → `step = 'details'`, `quantity = 1`.
- Imágenes: WebP en `frontend/public/images/` (~40 KB, 600 px) servidas por CloudFront con caché larga.

## Pruebas
- Unit de casos de uso con repositorio falso.
- Integración HTTP del controlador con `supertest` y el repositorio falso (códigos 200/400/404).
- Seed: test con Prisma mockeado verificando `upsert` con `update: {}`.
- RTL para pantalla, skeleton, error/reintento, agotado y atributos de imagen.
