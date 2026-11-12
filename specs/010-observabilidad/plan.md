# 010 · Plan

## Backend (arquitectura hexagonal)

### Dominio
- `domain/transaction/payment-events.ts`: puerto `PaymentEvents { finalized(tx: Transaction): void }`. El dominio no sabe que es un log.

### Aplicación
- `ApplyTransactionResult` recibe `PaymentEvents` (opcional, no-op por defecto) y lo llama con la transacción **devuelta** por `applyResult`. Así el ERROR por falta de stock en la carrera sale con su estado real. Solo se llama si la transacción estaba en PENDING (ya es la condición del caso de uso), y eso garantiza AC-010-09.
- `CreateTransaction`: en la rama de fallo de la pasarela (`status: 'ERROR'`), usa el resultado de `applyResult` y llama a `events.finalized`.
- Los casos de uso siguen devolviendo `Result`. El evento es un efecto secundario que nunca falla: el adaptador captura sus propios errores.

### Infraestructura
- `infrastructure/observability/request-context.ts`: `AsyncLocalStorage<{ requestId }>`, `currentRequestId()`.
- `infrastructure/observability/redact.ts`: redacción profunda de claves sensibles y de secuencias de 13–19 dígitos.
- `infrastructure/observability/json-logger.ts`: `JsonLogger implements LoggerService`. Escribe `process.stdout.write(JSON.stringify(entry) + '\n')`, de modo que el runtime de Lambda no añade prefijos. Mapea `log`→`info` y `verbose`→`debug`, filtra por `LOG_LEVEL` y añade `requestId` desde el contexto.
- `infrastructure/observability/request-logging.middleware.ts`: middleware de Express. Valida o genera `x-request-id`, ejecuta `next()` dentro de `als.run` y pone el header de respuesta. En `finish`/`close` escribe `http.request` una sola vez.
- `infrastructure/observability/log-payment-events.ts`: adaptador de `PaymentEvents` que escribe `payment.finalized` con el logger.
- `configure-app.ts`: `app.useLogger(jsonLogger)`, `app.use(requestLogging)` y `exposedHeaders: ['x-request-id']` en CORS.
- `main.ts` y `lambda.ts`: `NestFactory.create(AppModule, { bufferLogs: true })` para que el arranque también salga en JSON.
- `checkout.module.ts`: provee `PaymentEvents` con el adaptador.

## Infra (`infra/template.yaml`)
- Parámetros `AlarmLatencyP95Ms` (15000) y `Alarm5xxThreshold` (5 en 5 min).
- `AWS::Logs::MetricFilter` ×3 sobre `ApiFunctionLogGroup`: `{ $.event = "payment.finalized" && $.status = "APPROVED" }` (ídem DECLINED y ERROR), namespace `CheckoutChallenge`, métricas `PaymentsApproved`, `PaymentsDeclined` y `PaymentsError`.
- `AWS::CloudWatch::Alarm` ×2: `AWS/ApiGateway` `5xx` (Sum) y `Latency` (p95), dimensión `ApiId`.
- `AWS::CloudWatch::Dashboard` `${ProjectName}`: widgets de métricas, un widget de alarmas y un widget de Logs Insights con los últimos errores.
- Lambda `TracingConfig: { Mode: Active }` y `AWSXRayDaemonWriteAccess` en `ApiFunctionRole`. El rol de ejecución del CD ya permite esa política (`infra/github-oidc.yaml`).
- Output `DashboardUrl`.

## Pruebas
- Unitarias: `redact`, `JsonLogger` (formato, niveles, filtro, stdout, contexto) y el middleware (id válido, inválido o ausente, nivel según código, una sola línea).
- Integración con `bootCheckoutApp` y supertest: los headers, el `requestId` compartido con el log de la pasarela, la ausencia de tarjeta en stdout (approved, 400, 422 y 502) y `payment.finalized` (una vez; ERROR por pasarela; ERROR por stock; sin evento en el replay).
- Estáticas sobre la plantilla (estilo `template.spec.ts`): filtros, dashboard, alarmas y X-Ray.
- Después del despliegue (release v1.2.0): tráfico real en producción, capturas del dashboard para el README y `db:reset-demo` si hubo compras.
