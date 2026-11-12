# ADR 0006 — Resumen en dos capas fijas, sin toggle

- Estado: aceptada (2026-11-11). Cambia la interacción de la [spec 009](../../specs/009-backdrop-resumen/spec.md) (revisión 1, v1.1.0).

## Contexto

En v1.1.0 el paso Resumen siguió al pie de la letra el Backdrop de Material: una sola capa activa a
la vez. Para cambiar la cantidad o ir a **Editar datos** había que tocar el subencabezado
«Resumen del pedido», que bajaba la capa delantera, ocultaba **Pagar** y ponía un scrim.

En un checkout eso no es intuitivo:

- Los controles que cambian el pedido no se ven hasta que alguien descubre que el subencabezado
  es un botón. El chevron es la única pista.
- Mientras la trasera está activa, **Pagar** desaparece. Hay que cerrar la capa para pagar.
- El Backdrop está pensado para filtrar o navegar el contenido de la capa delantera, no para un
  resumen corto donde todo cabe en una pantalla.

## Decisión

Se conservan las dos capas, pero ninguna se oculta:

- **Capa trasera**, siempre visible: producto, selector − n + y **Editar datos**.
- **Capa delantera**: «Resumen del pedido», desglose, tarjeta enmascarada y **Pagar**.
- Se quitan el toggle de colapsar/expandir, el scrim y `aria-expanded`.
- **Móvil:** la trasera es compacta y va arriba. La delantera es una hoja anclada abajo con las
  esquinas superiores redondeadas, y **Pagar** se ve sin scroll a 375×667.
- **Desktop (≥ 1024px):** dos columnas en el contenedor centrado (trasera | delantera), alineadas
  arriba y sin el hueco vertical que dejaba la hoja anclada abajo.

## Consecuencias

- Más simple: desaparecen el estado local `frontActive`, el listener de **Esc**, la gestión de
  foco entre capas y el scrim. También salen sus tests (AC-009-02 y AC-009-03 de la revisión 1).
- Todos los controles se ven y se pueden tabular siempre. El foco entra al subencabezado para
  anunciar el paso.
- La pantalla tiene un poco más de contenido en móvil. El E2E vigila que **Pagar** se vea sin
  scroll a 375×667.
- Ya no es un Backdrop canónico de Material, sino una disposición en dos capas inspirada en él.
  El nombre `SummaryBackdrop` y las clases `backdrop__*` se conservan para no mover archivos ni
  romper el historial.
