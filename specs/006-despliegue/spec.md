# 006 · Despliegue en AWS

## Objetivo
Publicar el front y la API en AWS con HTTPS, headers de seguridad y CORS restringido, con un despliegue repetible de un solo comando y sin secretos en el repositorio.

## Alcance
- API NestJS como **Lambda** (arm64, fuera de la VPC) detrás de una **HTTP API** de API Gateway.
- SPA en **S3 privado + CloudFront** con Origin Access Control (OAC).
- Plantilla de CloudFormation (`infra/template.yaml`) y scripts `scripts/build-lambda.sh` y `scripts/deploy.sh`.
- Región `us-east-2` (SCP de la cuenta); base de datos en Neon (`us-east-1`), conexión SSL.

## Fuera de alcance
- Dominio propio y certificado ACM (se usan los dominios de CloudFront y API Gateway).
- Despliegue automático desde GitHub Actions — en esta spec el despliegue es manual con `scripts/deploy.sh` (el CD llegó después, ADR 0004/0005).
- WAF, alarmas y dashboards.

## Criterios de aceptación

### API en Lambda
- **AC-006-01** — Dado el handler de la Lambda, cuando recibe un evento de API Gateway HTTP API (payload v2) para `GET /health`, entonces responde `200` con `{"status":"ok"}`.
- **AC-006-02** — Dada una Lambda caliente, cuando recibe varias invocaciones, entonces la aplicación Nest se inicializa una sola vez y se reutiliza (menor latencia en arranque en caliente).
- **AC-006-03** — Dada cualquier respuesta de la API, cuando se inspeccionan sus headers, entonces incluye `Strict-Transport-Security` y `X-Content-Type-Options: nosniff`, y no expone `X-Powered-By`.
- **AC-006-04** — Dada una petición con `Origin`, cuando el origen es el dominio de CloudFront configurado en `CORS_ORIGINS`, entonces la API lo permite; con cualquier otro origen no devuelve `Access-Control-Allow-Origin`.
- **AC-006-05** — Dada la API desplegada, cuando se abre `/docs`, entonces se sirve Swagger con el contrato OpenAPI.
- **AC-006-06** — Dadas variables de entorno faltantes o inválidas, cuando arranca la Lambda, entonces falla de inmediato nombrando solo las variables (nunca sus valores).

### Infraestructura (plantilla)
- **AC-006-07** — Dada la plantilla, cuando se despliega, entonces el front se sirve desde un bucket S3 **privado** (bloqueo de acceso público) solo a través de CloudFront con OAC, con redirección HTTP→HTTPS y fallback de SPA (403/404 → `/index.html`).
- **AC-006-08** — Dada la plantilla, cuando CloudFront responde, entonces aplica una política de headers con HSTS (preload), CSP (`default-src 'self'`, `connect-src` limitado a la API, `frame-ancestors 'none'`), `X-Frame-Options: DENY`, `nosniff` y `Referrer-Policy`.
- **AC-006-09** — Dada la plantilla, cuando se crea la Lambda, entonces corre fuera de la VPC (sin `VpcConfig`), en arm64, con los secretos como parámetros `NoEcho` y `CORS_ORIGINS` derivado del dominio de CloudFront.
- **AC-006-10** — Dado el build del front, cuando se ejecuta con `VITE_API_URL`, entonces la URL de la API queda inyectada en el bundle (sin secretos en el front).

## Casos borde
- Cold start: el primer request tras inactividad tarda más (≈1 s); los siguientes reutilizan la app (AC-006-02).
- La CSP de CloudFront impide cargar fuentes o scripts externos: el front usa solo recursos propios.
- Sin `backend/.env.production` el script de despliegue se detiene antes de tocar AWS.
