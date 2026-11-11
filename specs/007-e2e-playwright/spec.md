# 007 · Pruebas E2E con Playwright

## Objetivo
Probar el flujo completo de compra en navegadores reales (Chromium, Firefox y WebKit) a tamaño móvil, de forma determinista y sin tocar la base de datos ni la pasarela, y dejar comandos simples para correrlas en local y en la CI.

## Alcance
- Suite E2E en `frontend/e2e/` con `@playwright/test`, contra el **build de producción** del front servido con `vite preview`.
- API simulada en el propio navegador (`page.route` sobre `http://api.mock`), con estado: stock, transacciones por `Idempotency-Key`.
- Proyectos `chromium`, `firefox` y `webkit`, todos con viewport **375×667** (iPhone SE).
- Job `e2e` en la CI que sube el reporte HTML cuando falla.
- Scripts npm `e2e`, `e2e:headed`, `e2e:ui` y `e2e:report`.

## Fuera de alcance
- E2E contra la API real o el sandbox de la pasarela (escriben en la base compartida; se verifican a mano y luego `db:reset-demo`).
- Pruebas visuales por captura (snapshot testing).

## Criterios de aceptación
- **AC-007-01** — Dado el producto con stock 10, cuando el usuario paga 1 unidad con la tarjeta `4242 4242 4242 4242` y datos de entrega válidos, entonces ve el resumen (producto + tarifa base + envío), luego «¡Pago aprobado!» con la referencia y la tarjeta enmascarada, y al volver a la tienda el producto muestra «Quedan 9».
- **AC-007-02** — Dada la tarjeta `4111 1111 1111 1111`, cuando el usuario paga, entonces ve «Pago rechazado» con el motivo, y al volver a la tienda el stock no cambia.
- **AC-007-03** — Dado el usuario en el resumen, cuando recarga la página, entonces vuelve al formulario con los datos de entrega conservados y la tarjeta vacía (nunca persistida); al reingresarla puede pagar y la compra se aprueba.
- **AC-007-04** — Dado un pago en curso, cuando el usuario recarga antes de recibir la respuesta, entonces la app recupera el pago por su `Idempotency-Key` y muestra el resultado sin enviar un segundo `POST /transactions`.
- **AC-007-05** — Dado cualquier escenario anterior, cuando se ejecuta a 375×667, entonces no hay desbordamiento horizontal ni errores en la consola, y ningún dato completo de la tarjeta queda en `localStorage`.
- **AC-007-06** — Dada la suite, cuando corre en la CI, entonces se ejecuta en Chromium, Firefox y WebKit y, si falla, el reporte HTML queda como artefacto del job.

## Casos borde
- Preflight CORS: la API simulada responde `OPTIONS` y agrega `Access-Control-Allow-Origin` (el front y la API están en orígenes distintos, como en producción).
- La recarga durante el pago corta la petición en vuelo: la API simulada ya registró la transacción y la expone por `/transactions/by-key/:key`.
