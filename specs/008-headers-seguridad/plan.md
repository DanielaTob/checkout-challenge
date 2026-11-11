# 008 · Plan

1. Escanear con la API del Observatory (`POST https://observatory-api.mdn.mozilla.net/api/v2/scan?host=…`) y leer el detalle (`GET …/api/v2/analyze?host=…`).
2. Tests primero en `backend/src/infrastructure/deploy/template.spec.ts` (verificación estática de la plantilla, como AC-006-07 a 09).
3. `infra/template.yaml`: `CustomHeadersConfig.Items` en `SecurityHeadersPolicy` con COOP, CORP y `Permissions-Policy` (`camera=(), microphone=(), geolocation=(), usb=(), payment=()`), todos con `Override: true`.
4. Tras el merge, despliegue con `scripts/deploy.sh`; verificación con `curl -I`, E2E y Chromium contra producción (sin pagar), y nuevo escaneo del Observatory.
5. README: nota en *Seguridad* con la nota, la puntuación y la fecha del escaneo.
