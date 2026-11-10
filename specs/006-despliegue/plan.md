# 006 · Plan

Decisiones en [ADR 0001](../../docs/adr/0001-neon-y-lambda.md) (Neon + Lambda, región `us-east-2`) y [ADR 0002](../../docs/adr/0002-versiones-herramientas.md).

## Backend
- `src/lambda.ts`: handler con `@codegenie/serverless-express`; la app Nest se crea en el primer request y se cachea en el módulo (warm starts).
- `src/configure-app.ts`: setup HTTP compartido por `main.ts`, Lambda y tests — `helmet`, CORS desde `CORS_ORIGINS`, `ValidationPipe`, Swagger en `/docs`.
- `src/infrastructure/config/env.ts`: validación de entorno con class-validator; el error solo nombra variables.

## Infraestructura (`infra/template.yaml`)
- Lambda arm64 (Node 22) fuera de la VPC, rol con `AWSLambdaBasicExecutionRole`, log group con retención de 14 días.
- HTTP API con ruta `$default`, integración proxy v2 y throttling.
- Bucket S3 privado (bloqueo de acceso público, cifrado, `BucketOwnerEnforced`) + CloudFront con OAC, HTTP/2-3, `redirect-to-https`, `CachingOptimized`, respuestas 403/404 → `index.html`.
- `ResponseHeadersPolicy` con HSTS, CSP, frame options, nosniff y referrer.
- Parámetros `NoEcho` para los secretos; `CORS_ORIGINS` con `!Sub https://${Distribution.DomainName}`.

## Scripts
- `scripts/build-lambda.sh` + `scripts/prune-peers.cjs`: dependencias de producción, poda de peers y motores de Prisma no usados → zip de ~15 MB (61 MB descomprimido).
- `scripts/deploy.sh`: `cloudformation package/deploy`, `prisma migrate deploy` + seed idempotente, subida del SPA (assets con caché inmutable, `index.html` sin caché, invalidación) y smoke test.

## Pruebas
- `backend/src/lambda.spec.ts`: eventos API Gateway v2 contra el handler (AC-006-01, AC-006-02).
- `backend/src/configure-app.spec.ts`, `env.spec.ts`: headers, CORS, Swagger y entorno (AC-006-03 a 06).
- `backend/src/infrastructure/deploy/template.spec.ts`: verificación estática de la plantilla (AC-006-07 a 09).
- `frontend/src/shared/config.test.ts`: URL de la API inyectada en build (AC-006-10).
- Verificación manual en Chromium (Playwright) contra CloudFront a 375×667 y 1280×800; compras de prueba con las tarjetas aprobada y rechazada.
