# 009 · Resumen con el patrón Backdrop de Material

## Objetivo
Llevar el paso 3 (Resumen) al componente [Backdrop de Material](https://m2.material.io/components/backdrop), en móvil y desktop: una capa trasera con los controles que cambian el pedido y una capa delantera con el resumen y **Pagar**, con una sola capa activa a la vez. Solo cambia la presentación: cotización, pago, idempotencia y navegación siguen igual (spec 003).

## Alcance
- Front: `SummaryBackdrop` reemplaza la hoja modal (`SummarySheet`) del paso `summary`. Se muestra dentro del contenedor centrado de la app, en lugar de la lista de productos.
- Tests unitarios y E2E del resumen (spec 003 y 007) adaptados al nuevo patrón.

## Fuera de alcance
- Cambios de lógica (slices, thunks, API).
- El modal de tarjeta y entrega (paso 2) y la pantalla de resultado.

## Criterios de aceptación
- **AC-009-01** — Dado el paso Resumen, cuando se muestra, entonces la **capa trasera** contiene el producto (imagen, nombre, precio unitario), el selector de cantidad y **Editar datos**, y la **capa delantera** tiene el subencabezado «Resumen del pedido», el desglose (subtotal, tarifa base, envío, total), la tarjeta enmascarada y **Pagar**. No hay `role="dialog"` ni overlay.
- **AC-009-02** — Dado el resumen, cuando entra, entonces la capa delantera está activa: la trasera muestra solo el producto y la cantidad, sin sus controles. Cuando toco el subencabezado (o su ícono), la delantera baja hasta su subencabezado con un scrim suave y la trasera muestra sus controles. Al tocarlo otra vez, o tocar el scrim, la delantera vuelve a subir. Solo una capa está activa a la vez.
- **AC-009-03** — Dado el subencabezado, cuando cambia de capa, entonces su botón expone `aria-expanded` (`true` con la delantera activa) y `aria-controls`. Al revelar la trasera, el foco pasa a su primer control. Al volver a la delantera, el foco regresa al botón. **Esc** con la trasera activa sube la delantera. El contenido de la capa inactiva no es accesible ni enfocable.
- **AC-009-04** — Dado el resumen a 375×667, cuando carga, entonces la capa delantera ocupa todo el ancho del contenedor, está anclada abajo, tiene esquinas superiores de 16px y **Pagar** se ve sin scroll, sin desbordamiento horizontal. A 1280×800 se usa el mismo patrón dentro del contenedor centrado, sin diálogo centrado.
- **AC-009-05** — Dado `prefers-reduced-motion: reduce`, cuando cambian las capas, entonces no hay transiciones ni animaciones de movimiento.

## Casos borde
- Mientras se procesa el pago, el subencabezado no cambia de capa (el progreso del pago queda a la vista).
- Si la cotización falla o no hay stock, el aviso aparece en la capa delantera, como antes.
- Al cambiar la cantidad en la trasera, el total de la delantera se recotiza (lógica de 003). El subencabezado muestra el total también con la delantera abajo.
