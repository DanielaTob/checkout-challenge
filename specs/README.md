# Specs

| Spec | Qué cubre | Estado |
|---|---|---|
| [001-catalogo-stock](001-catalogo-stock/spec.md) | Productos, stock, pantalla de producto | Implementada |
| [002-tarjeta-entrega](002-tarjeta-entrega/spec.md) | Modal de tarjeta (Luhn, fecha, CVC, marca) y datos de entrega | Implementada |
| [003-resumen-pago](003-resumen-pago/spec.md) | Cotización en backend y backdrop de resumen | Implementada |
| [004-transaccion-pasarela](004-transaccion-pasarela/spec.md) | Clientes, transacción, pasarela, entrega, stock y pantalla de resultado | Implementada |
| [005-resiliencia](005-resiliencia/spec.md) | Recuperar el paso tras un refresh, idempotencia y timeouts | Implementada |
| [006-despliegue](006-despliegue/spec.md) | AWS (Lambda + HTTP API, S3 + CloudFront), HTTPS y headers | Implementada |
| [007-e2e-playwright](007-e2e-playwright/spec.md) | E2E del flujo completo en Chromium, Firefox y WebKit (API simulada) | Implementada |
| [008-headers-seguridad](008-headers-seguridad/spec.md) | COOP, CORP y Permissions-Policy en CloudFront tras el HTTP Observatory | Implementada |
| [009-backdrop-resumen](009-backdrop-resumen/spec.md) | Paso Resumen con el patrón Backdrop de Material (móvil y desktop) | Implementada |
| [010-observabilidad](010-observabilidad/spec.md) | Logs JSON con requestId, eventos de pago, dashboard, alarmas y X-Ray | Implementada |

## Contrato de API (visión global)

| Método | Ruta | Recurso | Spec | Códigos |
|---|---|---|---|---|
| GET | `/products` | productos/stock | 001 | 200 |
| GET | `/products/:id` | productos/stock | 001 | 200, 400, 404 |
| GET | `/products/:id/quote?quantity=n` | productos/stock | 003 | 200, 400, 404, 409 |
| POST | `/customers` | clientes | 004 | 201, 200 (ya existía), 400 |
| POST | `/transactions` | transacciones | 004 | 201, 200 (misma Idempotency-Key), 400, 404, 409, 422, 502 |
| GET | `/transactions/:id` | transacciones | 004 | 200, 400, 404, 502 |
| GET | `/transactions/by-key/:idempotencyKey` | transacciones | 005 | 200, 400, 404, 502 |
| GET | `/deliveries/:id` | entregas | 004 | 200, 400, 404 |
| GET | `/health` | — | — | 200 |

Errores con forma única: `{ statusCode, error, message }`.

## Cambios propuestos al modelo inicial

En `transactions` se agregan tres columnas (ver 004 y 005):

- `idempotency_key` (único, nullable): evita cobrar dos veces si el usuario recarga en pleno pago.
- `shipping` (JSONB): copia de la dirección hasta que el pago queda APPROVED y se crea la entrega.
- `failure_reason` (nullable): motivo legible de DECLINED/ERROR.
