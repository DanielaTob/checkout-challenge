# 004 · Transacción con la pasarela

## Objetivo
Cobrar con la pasarela de pago (sandbox) y, solo si el pago queda APPROVED, crear la entrega y descontar el stock de forma atómica e idempotente. Mostrar el resultado y volver al producto con el stock actualizado.

## Alcance
- API: `POST /customers`, `POST /transactions`, `GET /transactions/:id`, `GET /deliveries/:id`.
- Adaptador de la pasarela: acceptance token, tokenización de tarjeta, creación de transacción con firma de integridad, consulta de estado.
- Front: pantalla de resultado (4) y vuelta al producto (5).

## Fuera de alcance
- Webhooks de eventos de la pasarela (`GATEWAY_EVENTS_SECRET` queda preparado, no se usa).
- Reembolsos.
- Métodos de pago distintos a tarjeta.

## Flujo
1. El front hace `POST /customers` (crea o reutiliza por email).
2. El front hace `POST /transactions` con `Idempotency-Key`, `productId`, `quantity`, `customerId`, `shipping` y `card`.
3. El backend valida la tarjeta, calcula montos con `buildQuote` y, en una sola transacción de BD con el producto bloqueado, **valida el stock** (`409` si no alcanza) y guarda la transacción en **PENDING** con una `reference` única.
4. Pide el acceptance token, tokeniza la tarjeta y crea la transacción en la pasarela con `signature = sha256(reference + amountInCents + currency + integritySecret)`.
5. Consulta el estado cada 1 s hasta 10 intentos.
6. Si es final, lo aplica (paso 7) y responde `201`. Si no, responde `201` con `PENDING` y el front sigue consultando con `GET /transactions/:id`.
7. **APPROVED**: en una sola transacción de BD actualiza el estado, crea la entrega y descuenta el stock. **DECLINED/ERROR**: solo actualiza el estado y el motivo.

## Criterios de aceptación

### Clientes
- **AC-004-01** — Dado un cliente válido (`fullName`, `email`, `phone`), cuando hago `POST /customers`, entonces recibo `201` con su `id`; si el email ya existía, recibo `200` con el mismo `id` y los datos actualizados; con datos inválidos, `400`.

### Crear transacción
- **AC-004-02** — Dado un pedido válido, cuando hago `POST /transactions`, entonces la transacción se guarda en `PENDING` con `reference` única y montos calculados en el backend **antes** de llamar a la pasarela.
- **AC-004-03** — Dada una cantidad mayor que el stock, cuando hago `POST /transactions`, entonces recibo `409`, no se crea la transacción y no se llama a la pasarela.
- **AC-004-04** — Dado un `productId` o `customerId` inexistente, cuando hago `POST /transactions`, entonces recibo `404`.
- **AC-004-05** — Dada una tarjeta que no pasa Luhn, vencida o de marca no soportada, cuando hago `POST /transactions`, entonces recibo `422` sin llamar a la pasarela; si el cuerpo está mal formado, `400`.
- **AC-004-06** — Dados `reference`, `amountInCents`, `currency` y el secreto de integridad, cuando se calcula la firma, entonces es `sha256` en hex de su concatenación (verificado con un vector conocido).
- **AC-004-07** — Dado el adaptador de la pasarela, cuando se procesa un pago, entonces obtiene el acceptance token, tokeniza la tarjeta con la llave pública y crea la transacción con token, acceptance token, firma, referencia, monto, moneda, email y 1 cuota.
- **AC-004-08** — Dada una transacción creada en la pasarela, cuando el estado sigue en PENDING, entonces se consulta hasta 10 veces cada 1 s; si no llega a un estado final, la API responde `201` con `status: "PENDING"`.

### Aplicar el resultado
- **AC-004-09** — Dado que la pasarela responde APPROVED, cuando se aplica el resultado, entonces en una sola transacción de BD: la transacción pasa a APPROVED con `gatewayTransactionId`, se crea la entrega (`PENDING`) con la dirección y el stock baja en `quantity`.
- **AC-004-10** — Dado que la pasarela responde DECLINED o ERROR, cuando se aplica el resultado, entonces la transacción guarda ese estado y el motivo, no se crea entrega y el stock no cambia.
- **AC-004-11** — Dado un resultado ya aplicado, cuando se intenta aplicar otra vez (reintento o consulta paralela), entonces no se descuenta stock dos veces ni se crea una segunda entrega.
- **AC-004-12** — Dado que el stock alcanzaba al crear la transacción PENDING pero se agotó **durante el pago** (otro pago se aprobó en medio), cuando el pago queda APPROVED y se aplica el resultado, entonces el stock no baja de 0, no se crea entrega y la transacción queda en ERROR con `failureReason = "OUT_OF_STOCK_AFTER_PAYMENT"`. Es el **único** caso en que la falta de stock produce ERROR.
- **AC-004-21** — Dado un pedido, cuando se crea la transacción PENDING, entonces el stock se valida contra la BD en la **misma transacción de BD** que el INSERT, con la fila del producto bloqueada (`SELECT … FOR UPDATE`); si `quantity > stock` responde `409` (`OUT_OF_STOCK`), no se guarda ninguna transacción (ni PENDING ni ERROR) y no se llama a la pasarela.
- **AC-004-13** — Dado que la pasarela falla (5xx, timeout o respuesta inválida) al tokenizar o crear, cuando hago `POST /transactions`, entonces recibo `502` y la transacción queda en ERROR.

### Consultas
- **AC-004-14** — Dada una transacción, cuando hago `GET /transactions/:id`, entonces recibo `200` con `status`, `reference`, montos, `cardBrand`, `cardLast4` y la entrega si existe; si estaba PENDING, se consulta la pasarela y se aplica el resultado; si no existe, `404`.
- **AC-004-15** — Dada una entrega, cuando hago `GET /deliveries/:id`, entonces recibo `200` con dirección y estado; si no existe, `404`.

### Seguridad
- **AC-004-16** — Dado cualquier pago, cuando se procesa, entonces el número completo y el CVC no se guardan en la BD ni aparecen en logs ni en respuestas; solo se guardan `cardBrand` y `cardLast4`.

### Frontend
- **AC-004-17** — Dado que el pago queda APPROVED, cuando veo el resultado, entonces aparece un mensaje de éxito con la referencia y el total; si queda DECLINED o ERROR, un mensaje de pago rechazado con **Intentar de nuevo** (vuelve al modal).
- **AC-004-18** — Dado que la respuesta es PENDING, cuando estoy en el resultado, entonces veo "Procesando pago" y el front consulta `GET /transactions/:id` cada 2 s hasta un estado final (máximo 2 min).
- **AC-004-19** — Dado el resultado final, cuando toco **Volver a la tienda**, entonces vuelvo a la pantalla de producto, se piden de nuevo los productos (stock actualizado) y se borran la tarjeta y la transacción del estado.
- **AC-004-20** — Dado que la API responde 502 o falla la red, cuando pago, entonces veo un mensaje entendible ("La pasarela no respondió, no se hizo ningún cobro") y puedo reintentar.

## Casos borde
- Dos pestañas pagando la última unidad: ambas pasan la validación al crear su PENDING (el stock solo se descuenta al aprobar); la primera en aplicarse descuenta y la segunda cae en AC-004-12.
- Una pestaña pide más unidades de las que quedan → `409` al crear (AC-004-21); no queda rastro en `transactions`.
- La pasarela devuelve APPROVED después de los 10 intentos → lo aplica el `GET /transactions/:id` del front.
- Tarjetas de prueba del sandbox: una aprobada y una rechazada (se confirman con curl antes de implementar el adaptador).
