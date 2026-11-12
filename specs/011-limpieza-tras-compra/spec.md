# 011 · Limpieza de datos tras una compra aprobada

## Objetivo
Que, después de una compra aprobada, el navegador no conserve los datos de entrega ni el progreso del checkout, y que tras un pago rechazado el usuario pueda reintentar sin volver a escribir la entrega.

## Alcance
- Front: `ResultScreen` y `checkoutSlice` (qué se conserva al volver a la tienda según el estado final).
- Lo persistido en `localStorage` (redux-persist) refleja esa limpieza.

## Fuera de alcance
- La lógica del pago, el backend y los contratos de la API.
- La recuperación al recargar a mitad del flujo (spec 005), que no cambia.

## Criterios de aceptación
- **AC-011-01** — Dado un pago **APPROVED**, cuando toco **Volver a la tienda**, entonces vuelvo a la pantalla de producto y el estado del checkout queda en su valor inicial: sin datos de entrega, sin tarjeta (marca y últimos 4), sin producto ni cantidad, sin transacción ni `Idempotency-Key`, y sin la sesión de tarjeta en memoria.
- **AC-011-02** — Dado un pago **APPROVED** y que volví a la tienda, cuando reviso `localStorage`, entonces lo persistido ya no contiene ningún dato de entrega (nombre, email, teléfono, dirección, ciudad, departamento, código postal), ni la tarjeta enmascarada, ni la referencia o el id de la transacción.
- **AC-011-03** — Dado un pago **APPROVED** y que volví a la tienda, cuando empiezo otra compra (o recargo y la empiezo), entonces el modal de tarjeta y entrega aparece con todos los campos vacíos.
- **AC-011-04** — Dado un pago **DECLINED** o **ERROR**, cuando toco **Intentar de nuevo**, entonces el modal se abre con los datos de entrega cargados, la tarjeta vacía y una nueva `Idempotency-Key` en el siguiente pago.
- **AC-011-05** — Dado un pago **DECLINED** o **ERROR**, cuando toco **Volver a la tienda**, entonces se borran la tarjeta y la transacción pero se conservan los datos de entrega (en el estado y en `localStorage`) para la siguiente compra.

## Casos borde
- Recargar en la pantalla de resultado aprobado sigue mostrando el resultado (AC-005-04); la limpieza ocurre al tocar **Volver a la tienda**.
- Recargar a mitad del flujo (`details`, `summary`, pago en curso) se comporta igual que antes (AC-005-01 a AC-005-05).
- Una compra aprobada con `localStorage` bloqueado (modo privado) limpia el estado igual, sin errores.
