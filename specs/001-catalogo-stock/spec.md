# 001 · Catálogo y stock

## Objetivo
Mostrar los productos sembrados con su stock real y permitir iniciar el pago de uno de ellos.

## Alcance
- API: `GET /products` y `GET /products/:id`.
- Seed idempotente de productos (no hay endpoint para crear productos).
- Front: pantalla de producto (pantalla 1) mobile-first con imagen, nombre, descripción, precio, stock y botón **Pay with credit card**.

## Fuera de alcance
- Crear, editar o borrar productos.
- Búsqueda, filtros o paginación.
- Carrito con varios productos.

## Criterios de aceptación

### Backend
- **AC-001-01** — Dado que hay productos sembrados, cuando hago `GET /products`, entonces recibo `200` con una lista donde cada producto tiene `id`, `name`, `description`, `imageUrl`, `priceInCents` y `stock`.
- **AC-001-02** — Dado un producto existente, cuando hago `GET /products/:id`, entonces recibo `200` con ese producto.
- **AC-001-03** — Dado un UUID que no existe, cuando hago `GET /products/:id`, entonces recibo `404`.
- **AC-001-04** — Dado un `id` que no es UUID, cuando hago `GET /products/:id`, entonces recibo `400` sin consultar la BD.
- **AC-001-05** — Dado que el seed ya corrió y se vendió stock, cuando lo corro de nuevo, entonces no duplica productos ni restablece el stock.

### Frontend
- **AC-001-06** — Dado que la API responde, cuando abro la app, entonces veo cada producto con imagen, nombre, descripción, precio en COP (`$ 249.900`) y unidades disponibles.
- **AC-001-07** — Dado que la API tarda, cuando abro la app, entonces veo un skeleton de carga; y si la API falla, veo un mensaje de error con botón **Reintentar** que vuelve a pedir los productos.
- **AC-001-08** — Dado un producto con `stock = 0`, cuando lo veo, entonces aparece **Agotado** y el botón de pago está deshabilitado.
- **AC-001-09** — Dado un producto con stock, cuando toco **Pay with credit card**, entonces se guarda el producto elegido (cantidad 1) y se abre el modal de tarjeta y entrega (paso `details`).
- **AC-001-10** — Dada la pantalla a 375×667, cuando se renderiza, entonces la imagen tiene `alt`, `width`, `height`, `loading="lazy"` (salvo la primera, `eager`) y `decoding="async"`, y nada se desborda horizontalmente.

## Casos borde
- Lista vacía → mensaje "No hay productos disponibles" (sin error).
- Imagen que no carga → se muestra un placeholder del mismo tamaño (sin salto de layout).
- Precio con centavos → se redondea al formato COP sin decimales.
