# 009 · Resumen con el patrón Backdrop de Material

## Objetivo
Llevar el paso 3 (Resumen) a dos capas inspiradas en el [Backdrop de Material](https://m2.material.io/components/backdrop): una capa trasera con los controles que cambian el pedido y una capa delantera con el resumen y **Pagar**. Las dos capas están siempre visibles: no hay toggle para colapsar o expandir ni scrim (ver [ADR 0006](../../docs/adr/0006-resumen-dos-capas-fijas.md)). Solo cambia la presentación: cotización, pago, idempotencia y navegación siguen igual (spec 003).

## Alcance
- Front: `SummaryBackdrop` reemplaza la hoja modal (`SummarySheet`) del paso `summary`. Se muestra dentro del contenedor centrado de la app, en lugar de la lista de productos.
- Tests unitarios y E2E del resumen (spec 003 y 007) adaptados al patrón.

## Fuera de alcance
- Cambios de lógica (slices, thunks, API).
- El modal de tarjeta y entrega (paso 2) y la pantalla de resultado.

## Criterios de aceptación
- **AC-009-01** — Dado el paso Resumen, cuando se muestra, entonces la **capa trasera** contiene el producto (imagen, nombre, precio unitario), el selector de cantidad (− n +) y **Editar datos**, y la **capa delantera** tiene el subencabezado «Resumen del pedido», el desglose (subtotal, tarifa base, envío, total), la tarjeta enmascarada y **Pagar**. No hay `role="dialog"` ni overlay.
- **AC-009-02** — Dado el resumen, cuando se muestra y mientras sigo en él, entonces las dos capas están visibles a la vez: no hay botón para colapsar o expandir (ni `aria-expanded`), ni scrim, y ningún contenido de una capa se oculta. Al cambiar la cantidad en la trasera, el desglose y **Pagar** de la delantera se recotizan a la vista.
- **AC-009-03** — Dado el resumen, cuando entra, entonces el foco pasa a su subencabezado «Resumen del pedido» (un `h2` con `tabindex="-1"` que da nombre a la región de la capa delantera), y el orden de tabulación es el del documento: trasera (−, +, **Editar datos**) → delantera (**Pagar**), con todos los controles enfocables.
- **AC-009-04** — Dado el resumen a 375×667, cuando carga, entonces la capa trasera es compacta y está arriba, la delantera ocupa todo el ancho del contenedor, está anclada abajo y tiene esquinas superiores de 16px, y **Pagar** se ve sin scroll y sin desbordamiento horizontal.
- **AC-009-05** — Dado `prefers-reduced-motion: reduce`, cuando entra el resumen, entonces las capas no tienen transiciones ni animaciones de movimiento.
- **AC-009-06** — Dado el resumen a 1280×800 (≥ 1024px), cuando carga, entonces las dos capas son dos columnas dentro del contenedor centrado de 1080px (trasera a la izquierda, delantera a la derecha), alineadas arriba, sin diálogo centrado y sin espacio vacío entre ellas: la página no tiene scroll y **Pagar** se ve completo.

## Casos borde
- Mientras se procesa el pago, **Editar datos** y el selector de cantidad se deshabilitan (el progreso del pago queda a la vista).
- Si la cotización falla o no hay stock, el aviso aparece en la capa delantera, como antes.
- Al cambiar la cantidad en la trasera, el total de la delantera se recotiza (lógica de 003).
