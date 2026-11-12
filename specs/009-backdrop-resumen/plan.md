# 009 · Plan

> Revisión 2 (v1.3.0): las dos capas quedan fijas, sin toggle ni scrim ([ADR 0006](../../docs/adr/0006-resumen-dos-capas-fijas.md)). La revisión 1 (v1.1.0) alternaba la capa activa con el subencabezado.

## Componente
- `frontend/src/features/payment/SummaryBackdrop.tsx` (sustituye a `SummarySheet.tsx`) usa los mismos selectores y dispatches: `fetchQuote`, `setQuantity`, `goToStep('details')`, `payTransaction`. No tiene estado local de UI.
- Estructura:
  - `div.backdrop`.
  - `div.backdrop__back`: fila del producto (imagen, nombre, precio unitario; la descripción solo en desktop) + `div.backdrop__controls` con `QuantityStepper` y **Editar datos**, siempre visibles. Ambos se deshabilitan mientras se paga.
  - `section.backdrop__front` (`aria-labelledby` → `h2` «Resumen del pedido», `tabindex="-1"`): desglose, tarjeta, avisos y **Pagar**.
- Foco: al entrar, el `h2` de la delantera (anuncia el paso). Tabulación en orden del documento: trasera → delantera.
- `App.tsx`: en `summary`, `main` muestra el backdrop en lugar de `ProductList` (los productos ya están en el store, porque el paso 2 viene de la lista).

## CSS (`payment.css`)
- Móvil: `.app:has(.backdrop)` sin padding inferior. `main` y `.backdrop` crecen (`flex: 1`); la trasera es compacta (imagen de 64px, cantidad y **Editar datos** en una fila) y la delantera queda abajo con `margin-top: auto` + `position: sticky; bottom: 0`, a todo el ancho del contenedor (margen negativo `-var(--space)`), con esquinas `16px 16px 0 0` y sombra superior.
- Desktop (≥ 1024px): `.backdrop` es un grid de dos columnas (`minmax(0, 1fr) minmax(360px, 420px)`) alineadas arriba; `main` deja de crecer, así que no queda espacio vacío. La delantera es una tarjeta con las cuatro esquinas de 16px y deja de ser sticky.
- Animación de entrada de la delantera (`translateY` + opacidad). Con `prefers-reduced-motion: reduce`, `animation: none` y `transition: none`.

## Pruebas
- Jest: `SummaryBackdrop.test.tsx` (AC-003-04/05/09/10, AC-009-01/02/03). `QuantityStepper.test.tsx` y `PayButton.test.tsx` usan los controles directamente.
- Playwright: `e2e/backdrop.spec.ts` (AC-009-02/03/04 a 375×667, AC-009-06 a 1280×800, AC-009-05 con `reducedMotion: 'reduce'`), en los tres navegadores.
