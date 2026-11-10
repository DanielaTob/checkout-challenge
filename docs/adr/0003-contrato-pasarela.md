# ADR 0003 — Contrato del sandbox de la pasarela de pago

- Estado: aceptada
- Fecha: 2026-11-10
- Probado con `curl` contra `GATEWAY_BASE_URL` (sandbox) con las llaves de prueba de `backend/.env`.

## Acceptance token — `GET /merchants/{GATEWAY_PUBLIC_KEY}`
- Sin autenticación. **200**.
- Respuesta `{ data, meta }`. En `data`:
  - `presigned_acceptance.acceptance_token` (JWT, ~336 caracteres), `type = END_USER_POLICY`, `permalink` (términos que el usuario acepta).
  - `presigned_personal_data_auth.acceptance_token`: autorización de tratamiento de datos personales. La creación de transacciones lo recibe en `accept_personal_auth`. Se envía siempre.
  - **Los acceptance tokens son de un solo uso**: un segundo `POST /transactions` con el mismo token responde 422 `"El token de aceptación ya fue usado"`. Se piden de nuevo en cada pago (no se cachean).
  - `accepted_currencies = ["COP"]`; `accepted_payment_methods` incluye `CARD`.
- El front debe mostrar el enlace a los términos (`permalink`) junto al botón Pagar.

## Tokenización — `POST /tokens/cards`
- `Authorization: Bearer {GATEWAY_PUBLIC_KEY}`.
- Cuerpo: `{ number, cvc, exp_month: "MM", exp_year: "YY", card_holder }` (todo string).
- **201** `{ status: "CREATED", data: { id: "tok_…", brand, last_four, bin, exp_month, exp_year, card_holder, created_with_cvc, expires_at, validity_ends_at } }`.
- **422** `{ error: { type: "INPUT_VALIDATION_ERROR", messages: { campo: [...] } } }` con datos inválidos (p. ej. `cvc`, `card_holder`).
- La tokenización **no** decide aprobación: las tarjetas aprobada y rechazada tokenizan igual; el resultado sale al crear la transacción.
- `brand` y `last_four` del token son la fuente para `card_brand` y `card_last4`.

## Tarjetas de prueba (sandbox)
| Número | Resultado esperado |
|---|---|
| `4242 4242 4242 4242` | APPROVED (confirmado: PENDING → APPROVED en ~4 s) |
| `4111 1111 1111 1111` | DECLINED (confirmado: `status_message` "La transacción fue rechazada (Sandbox)") |

Cualquier CVC de 3 dígitos y fecha futura.

## Crear transacción — `POST /transactions`
- `Authorization: Bearer {GATEWAY_PRIVATE_KEY}`.
- Cuerpo: `{ acceptance_token, accept_personal_auth, amount_in_cents, currency: "COP", signature, customer_email, reference, payment_method: { type: "CARD", token, installments: 1 } }`.
- `signature = sha256(reference + amount_in_cents + currency + GATEWAY_INTEGRITY_SECRET)` en hex.
- **201** `{ data: { id, status: "PENDING", status_message, reference, amount_in_cents, ... } }`. Siempre nace en PENDING.
- **422** `{ error: { type: "INPUT_VALIDATION_ERROR", messages } }` si falta un campo, la firma no cuadra o el acceptance token ya se usó.

## Consultar transacción — `GET /transactions/{id}`
- Sin autenticación. **200** `{ data: { status, status_message, ... } }`; estados `PENDING | APPROVED | DECLINED | ERROR | VOIDED`.
- **404** `{ error: { type: "NOT_FOUND_ERROR", reason } }` si el id no existe.
- En el sandbox llega a estado final en 3–4 consultas con 1 s de espera.

## Consecuencias en el diseño
- Puerto `PaymentGateway.getAcceptanceTokens()` devuelve **los dos** tokens.
- Los errores 422 de la pasarela al tokenizar se mapean a `VALIDATION` (422) y no a `GATEWAY_ERROR` (502): el fallo es de los datos de la tarjeta, no de la pasarela.
- `getAcceptanceTokens()` se llama en **cada** pago (los tokens son de un solo uso).
- `VOIDED` se trata como `DECLINED` en el dominio.
- El `status_message` de DECLINED/ERROR se guarda como `failure_reason`.
