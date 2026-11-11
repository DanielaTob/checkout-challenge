# 003 · Resumen de pago

## Objetivo
Mostrar en un backdrop (estilo Material, pantalla 3) el desglose del pago calculado por el backend, y lanzar el pago con un solo toque.

## Alcance
- API: `GET /products/:id/quote?quantity=n` devuelve el desglose. El backend es la única fuente de verdad de los montos.
- Front: backdrop inferior con producto, cantidad, subtotal, tarifa base, envío, total, tarjeta enmascarada y botón **Pagar**.

## Fuera de alcance
- Cupones o descuentos.
- Envío variable por ciudad (el envío es fijo, de `DELIVERY_FEE_IN_CENTS`).

## Criterios de aceptación

### Backend
- **AC-003-01** — Dado un producto con stock suficiente, cuando hago `GET /products/:id/quote?quantity=2`, entonces recibo `200` con `subtotalInCents = price × 2`, `baseFeeInCents = BASE_FEE_IN_CENTS`, `deliveryFeeInCents = DELIVERY_FEE_IN_CENTS`, `totalInCents` = la suma y `currency = "COP"`.
- **AC-003-02** — Dada una cantidad mayor que el stock, cuando pido la cotización, entonces recibo `409`.
- **AC-003-03** — Dada una cantidad que no es entero entre 1 y 10, o un id que no es UUID, cuando pido la cotización, entonces recibo `400`; con un producto inexistente, `404`.

### Frontend
- **AC-003-04** — Dado que llego al paso `summary`, cuando se pide la cotización, entonces el backdrop muestra imagen y nombre del producto, cantidad, subtotal, tarifa base, envío y total en COP, con los montos que devolvió la API.
- **AC-003-05** — Dado el resumen, cuando se muestra la tarjeta, entonces aparece como `VISA •••• 4242` (nunca el número completo).
- **AC-003-06** — Dado el resumen, cuando cambio la cantidad con los botones − / +, entonces se vuelve a cotizar y el + se deshabilita al llegar al stock (o a 10).
- **AC-003-07** — Dado que toco **Pagar**, cuando la petición está en curso, entonces el botón queda deshabilitado con un indicador de carga, y tocarlo varias veces envía una sola petición.
- **AC-003-08** — Dado el resumen, cuando toco **Editar datos**, entonces vuelvo al modal con los datos de entrega cargados.
- **AC-003-09** — Dado que la cotización responde `409`, cuando se muestra, entonces veo "Ya no hay stock suficiente" y **Pagar** queda deshabilitado.
- **AC-003-10** — Dado el backdrop, cuando se muestra a 375×667, entonces sigue el patrón Backdrop de Material (capa trasera con los controles y capa delantera anclada abajo con esquinas superiores redondeadas; detalle en la spec 009), y el botón **Pagar** queda visible sin scroll horizontal. *(Hasta v1.0.1 era una hoja modal con `role="dialog"` sobre un fondo atenuado.)*

## Casos borde
- La cotización falla por red → mensaje con **Reintentar**; Pagar deshabilitado.
- Si las tarifas cambian en el backend entre la cotización y el pago, manda el backend (la transacción recalcula; ver 004).
