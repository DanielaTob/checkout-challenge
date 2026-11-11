# 008 · Headers de seguridad del front (HTTP Observatory)

## Objetivo
Revisar el front desplegado con el [HTTP Observatory de MDN](https://developer.mozilla.org/en-US/observatory) y completar en CloudFront los headers que el informe marca como no implementados, sin romper la app.

## Contexto
Escaneo del 2026-11-11 sobre `https://d3uvn5ovkcpvxw.cloudfront.net` (v1.0.0): **A+, 115/100, 12/12 tests superados**. Sin fallos, pero el informe marca como *no implementados* (sin penalización): `Cross-Origin-Opener-Policy`, `Cross-Origin-Resource-Policy` y `Cross-Origin-Embedder-Policy`. Tampoco hay `Permissions-Policy` (el Observatory no la puntúa).

## Alcance
- `infra/template.yaml`: `CustomHeadersConfig` en la `ResponseHeadersPolicy` existente.
- Redespliegue y nuevo escaneo; resultado y fecha en el README (sección de seguridad).

## Fuera de alcance
- `Cross-Origin-Embedder-Policy: require-corp`: solo hace falta para aislar el origen (`SharedArrayBuffer`); la app no lo usa y obligaría a que todo recurso externo futuro envíe CORP. Se documenta como decisión.
- Headers de la API: ya los pone `helmet` (AC-006-03).

## Criterios de aceptación
- **AC-008-01** — Dada la plantilla, cuando CloudFront responde, entonces agrega `Cross-Origin-Opener-Policy: same-origin` y `Cross-Origin-Resource-Policy: same-origin`, con `Override: true`.
- **AC-008-02** — Dada la plantilla, cuando CloudFront responde, entonces agrega `Permissions-Policy` que desactiva cámara, micrófono, geolocalización, USB y la Payment Request API (la app no usa ninguna; el pago va por la API propia).
- **AC-008-03** — Dados los headers nuevos, cuando se agregan, entonces se mantienen HSTS, CSP, `X-Frame-Options`, `nosniff` y `Referrer-Policy` de AC-006-08, y la plantilla no declara `Cross-Origin-Embedder-Policy`.

## Casos borde
- `Cross-Origin-Resource-Policy: same-origin` solo afecta a quien cargue los assets del front desde otro origen; la SPA los carga desde el mismo dominio de CloudFront.
- La llamada del front a la API es un `fetch` con CORS: COOP y CORP del front no la afectan (la API tiene su propio CORS).
