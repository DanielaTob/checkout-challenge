# 010 · Observabilidad (logs estructurados, métricas, dashboard, alarmas y trazas)

## Objetivo
Poder responder en producción "¿qué pasó con esta petición?" y "¿cómo va el checkout?" sin leer código: logs JSON correlacionados por `requestId`, métricas de negocio (pagos por estado) y de la API en un dashboard de CloudWatch, alarmas de 5xx y latencia, y trazas de X-Ray en la Lambda. Todo ello sin que un dato de tarjeta llegue nunca a los logs.

## Alcance
- Backend: logger JSON propio (una línea JSON por evento en stdout), middleware de contexto con `x-request-id`, log de acceso por petición, evento de negocio `payment.finalized` cuando una transacción sale de PENDING, y redacción defensiva de datos de tarjeta.
- `infra/template.yaml`: filtros de métricas sobre el log group de la Lambda, dashboard de CloudWatch, alarmas y X-Ray activo en la Lambda.
- README: secciones "Observabilidad" (con capturas del dashboard) y "Pipeline CI/CD" (diagrama de etapas).

## Fuera de alcance
- Notificaciones de alarmas (SNS, email o Slack). Las alarmas se ven en el dashboard y en la consola.
- X-Ray en API Gateway: las HTTP APIs (v2) no admiten trazas activas, solo las REST APIs. La traza empieza en la Lambda.
- Enviar `x-request-id` desde el front: añadiría un preflight CORS a cada GET. El front puede leer el id de la respuesta.
- Instrumentar Prisma o la pasarela con el SDK de X-Ray (subsegmentos).

## Criterios de aceptación

### Backend: logs
- **AC-010-01** — Dada cualquier petición HTTP, cuando termina, entonces se escribe exactamente una línea JSON `{"event":"http.request"}` con `timestamp` (ISO 8601), `level`, `requestId`, `method`, `path` (sin query string), `statusCode` y `durationMs` (número ≥ 0).
- **AC-010-02** — Dada una petición con `x-request-id` válido (`[A-Za-z0-9._-]{1,128}`), cuando se atiende, entonces la respuesta devuelve ese mismo valor en `x-request-id` y todas las líneas de log emitidas durante la petición (incluidas las de los adaptadores, como la pasarela) llevan ese `requestId`.
- **AC-010-03** — Dada una petición sin `x-request-id` o con uno inválido (vacío, demasiado largo o con caracteres fuera del patrón), cuando se atiende, entonces se genera un UUID v4, se devuelve en `x-request-id` y se usa en los logs. El valor inválido nunca se escribe en el log.
- **AC-010-04** — Dado el log de acceso, cuando el código es 5xx, entonces `level` es `error`; si es 4xx, `warn`; en otro caso, `info`. Dado `LOG_LEVEL=warn`, cuando hay líneas `info` o `debug`, entonces no se escriben.
- **AC-010-05** — Dado cualquier log emitido con el `Logger` de NestJS (arranque, adaptadores, excepciones no controladas), cuando se escribe, entonces sale como una sola línea JSON con `timestamp`, `level`, `context` y `message`, escrita directamente en stdout (sin el prefijo del runtime de Lambda), de forma que los filtros de métricas de CloudWatch puedan leerla.
- **AC-010-06** — Dado el flujo `POST /transactions` aprobado (201), rechazado por Luhn (422), con validación fallida (400) o con fallo de la pasarela (502), cuando se capturan todas las líneas escritas en stdout, entonces ninguna contiene el número de tarjeta, el CVC ni la clave `cvc`.
- **AC-010-07** — Dado un log que, por error, incluye un número de tarjeta (13–19 dígitos seguidos) en el mensaje o un campo llamado `number`, `cardNumber`, `pan`, `cvc` o `cvv`, cuando se escribe, entonces el valor aparece como `[REDACTED]`.

### Backend: eventos de negocio
- **AC-010-08** — Dada una transacción PENDING, cuando pasa a un estado final (APPROVED, DECLINED o ERROR, incluido el ERROR por fallo de la pasarela y el ERROR por falta de stock en la carrera), entonces se escribe una línea `{"event":"payment.finalized"}` con `reference`, `status`, `amountInCents` y `cardBrand`, sin email, nombre, dirección ni datos de la tarjeta.
- **AC-010-09** — Dada una transacción que ya está en estado final, cuando se reconsulta (`GET /transactions/:id`, `GET /transactions/by-key/:key` o un replay con la misma Idempotency-Key), entonces no se emite otro `payment.finalized`.
- **AC-010-10** — Dada la API, cuando el navegador hace una petición CORS desde un origen permitido, entonces la respuesta incluye `Access-Control-Expose-Headers` con `x-request-id`.

### Infraestructura
- **AC-010-11** — Dada la plantilla, entonces define filtros de métricas sobre el log group de la Lambda para `payment.finalized` con `status` APPROVED, DECLINED y ERROR (valor 1, valor por defecto 0) en un namespace propio del proyecto.
- **AC-010-12** — Dada la plantilla, entonces define un dashboard de CloudWatch con widgets de peticiones, 4xx, 5xx, latencia p50 y p95 de la HTTP API, errores, throttles y duración de la Lambda, pagos APPROVED/DECLINED/ERROR y el estado de las alarmas.
- **AC-010-13** — Dada la plantilla, entonces define una alarma de 5xx de la HTTP API y una de latencia p95, con `TreatMissingData: notBreaching` y umbrales parametrizados.
- **AC-010-14** — Dada la plantilla, entonces la Lambda tiene `TracingConfig: Active` y su rol incluye `AWSXRayDaemonWriteAccess`. Las salidas del stack incluyen la URL del dashboard.

## Casos borde
- Una excepción no controlada (500) también produce su línea `http.request` con `level: error`, además del log de Nest.
- Si el cliente cierra la conexión antes de terminar, se registra igualmente la duración (evento `close`), con el último estado conocido.
- Las peticiones `OPTIONS` (preflight) también tienen su log de acceso.
- La latencia p95 incluye `POST /transactions`, que espera a la pasarela hasta unos 25 s. Por eso el umbral por defecto de la alarma es de 15 s: por debajo, el aviso saltaría con pagos normales.
- Los logs fuera de una petición (arranque) no llevan `requestId`.
