# 009 · Plan

## Componente
- `frontend/src/features/payment/SummaryBackdrop.tsx` (sustituye a `SummarySheet.tsx`) usa los mismos selectores y dispatches: `fetchQuote`, `setQuantity`, `goToStep('details')`, `payTransaction`. El único estado nuevo es local de UI: `frontActive` (`useState(true)`).
- Estructura:
  - `section.backdrop` (región «Resumen del pedido»).
  - `div.backdrop__back`: fila del producto (siempre visible) + `div#back-controls` con `QuantityStepper` y **Editar datos** (`hidden` mientras la delantera está activa).
  - `section.backdrop__front`: `h2` con `button[aria-expanded][aria-controls]` («Resumen del pedido», chevron y total) + `div#front-body` (desglose, tarjeta, avisos, **Pagar**; `hidden` cuando la trasera está activa) + scrim (`aria-hidden`, clic → sube la delantera).
- Foco: al entrar, el botón del subencabezado. Al revelar la trasera, el primer control habilitado. Al volver, el botón. **Esc** (listener en `document` mientras la trasera está activa) sube la delantera.
- `App.tsx`: en `summary`, `main` muestra el backdrop en lugar de `ProductList` (los productos ya están en el store, porque el paso 2 viene de la lista).

## CSS (`payment.css`)
- `.app:has(.backdrop)` sin padding inferior. `main` y `.backdrop` crecen (`flex: 1`), y la delantera queda abajo con `margin-top: auto` + `position: sticky; bottom: 0`.
- Delantera a todo el ancho del contenedor: margen negativo `-var(--space)` (en móvil va de borde a borde). Esquinas `16px 16px 0 0` y sombra superior.
- Desktop (≥ 1024px): trasera en fila (imagen grande + controles) y delantera en dos columnas (desglose | tarjeta + Pagar), dentro de los 1080px del contenedor.
- Animación de entrada de cada capa (`translateY` + opacidad). Con `prefers-reduced-motion: reduce`, `animation: none` y `transition: none`.

## Pruebas
- Jest: `SummaryBackdrop.test.tsx` (AC-003-04/05/09/10, AC-009-01/02/03). `QuantityStepper.test.tsx` y `PayButton.test.tsx` revelan la trasera cuando usan sus controles.
- Playwright: `e2e/backdrop.spec.ts` (AC-009-04 a 375×667 y 1280×800, AC-009-05 con `reducedMotion: 'reduce'`, más el cambio de capas y Esc en los tres navegadores).
