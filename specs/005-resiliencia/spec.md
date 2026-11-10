# 005 · Resiliencia

## Objetivo
Que recargar la página nunca haga perder el paso ni provoque un doble cobro, y que la persistencia jamás contenga datos sensibles de la tarjeta.

## Alcance
- Persistencia con redux-persist (versión y migración), rehidratación por paso.
- `Idempotency-Key` en `POST /transactions`.
- Timeouts y reintentos acotados hacia la pasarela.

## Fuera de alcance
- Modo offline / service worker.
- Sincronización entre pestañas.

## Criterios de aceptación

### Frontend
- **AC-005-01** — Dado que estaba en el modal (`details`), cuando recargo, entonces el modal se reabre con los datos de entrega cargados y los campos de tarjeta vacíos.
- **AC-005-02** — Dado que estaba en el resumen (`summary`), cuando recargo, entonces como la tarjeta no se persiste vuelvo al modal con los datos de entrega y el aviso "Por seguridad, vuelve a ingresar los datos de tu tarjeta".
- **AC-005-03** — Dado que estaba en el resultado con una transacción PENDING, cuando recargo, entonces la app retoma la consulta de `GET /transactions/:id` hasta el estado final.
- **AC-005-04** — Dado que estaba en el resultado con un estado final, cuando recargo, entonces veo el mismo resultado.
- **AC-005-05** — Dado que toqué Pagar y recargué antes de recibir la respuesta, cuando la app se rehidrata, entonces consulta la transacción por su `Idempotency-Key` persistida y muestra el resultado, sin crear un segundo cobro.
- **AC-005-06** — Dado que escribo una tarjeta completa y avanzo por todo el flujo, cuando reviso `localStorage`, entonces no contiene el número completo, el CVC ni la fecha de vencimiento en ningún momento.
- **AC-005-07** — Dado un estado persistido corrupto o de una versión anterior, cuando la app arranca, entonces vuelve a la pantalla de producto sin errores.
- **AC-005-08** — Dado que recargo en cualquier paso, cuando se rehidrata, entonces los productos y el stock se vuelven a pedir a la API (no se persisten).

### Backend
- **AC-005-09** — Dado un `POST /transactions` con una `Idempotency-Key` que ya existe, cuando llega, entonces responde `200` con esa misma transacción (actualizada si estaba PENDING) y no llama a la pasarela de nuevo.
- **AC-005-10** — Dada una `Idempotency-Key` ya usada con un cuerpo distinto (otro producto o cantidad), cuando llega, entonces responde `409`.
- **AC-005-11** — Dado que la pasarela no responde, cuando pasan 8 s, entonces se corta la petición y se trata como `GATEWAY_ERROR`.
- **AC-005-12** — Dada una consulta de estado a la pasarela que falla de forma transitoria, cuando se reintenta, entonces solo se reintentan las consultas `GET` (hasta 2 veces); la creación de la transacción en la pasarela nunca se reintenta.
- **AC-005-13** — Dado `GET /transactions/by-key/:idempotencyKey`, cuando la clave existe, entonces responde `200` con la transacción; si no, `404`.
- **AC-005-14** — Dado un `POST /transactions`, cuando la pasarela responde lento, entonces la petición completa no pasa de ~15 s: cada llamada a la pasarela usa como timeout el menor entre 8 s y el tiempo que queda del presupuesto, y la consulta de estado se detiene cuando se agota. Si el cobro ya se creó en la pasarela, la API responde `201` con `status: "PENDING"` y el front sigue con `GET /transactions/:id`; si el presupuesto se agota antes de crear el cobro, responde `502` y la transacción queda en ERROR sin cobro.
- **AC-005-15** — Dada una transacción PENDING, cuando hago `GET /transactions/:id` o `GET /transactions/by-key/:key` y la pasarela responde lento, entonces la consulta a la pasarela (con sus reintentos) no pasa de ~10 s: cada intento usa como timeout el menor entre 8 s y el tiempo que queda, y no se reintenta si ya no hay tiempo. Si se agota, responde `502` y la transacción sigue en PENDING para la siguiente consulta del front.

## Casos borde
- El usuario borra `localStorage` a mitad del flujo → vuelve a producto (sin error).
- La pasarela queda PENDING más de 2 min → el front muestra "Seguimos procesando tu pago" con un botón para consultar de nuevo.
