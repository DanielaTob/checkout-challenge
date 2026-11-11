# 007 · Plan

## Herramienta
`@playwright/test` (dependencia de desarrollo del front): un solo runner para los tres motores (Chromium, Firefox, WebKit), reporte HTML, trazas y modo UI. Cypress no corre WebKit de forma estable y no cubre Safari, que es el navegador del iPhone SE.

## Estructura
- `frontend/playwright.config.ts`: `webServer` hace `vite build` con `VITE_API_URL=http://api.mock` y `vite preview` en el puerto 4174; proyectos `chromium`, `firefox`, `webkit` a 375×667 con touch; reporter `html` (+ `github` en la CI); trazas y video en el primer reintento.
- `frontend/e2e/mockApi.ts`: API simulada con estado (productos, cotización, clientes, transacciones por id y por `Idempotency-Key`); 4242 → `APPROVED` y descuenta stock, 4111 → `DECLINED`.
- `frontend/e2e/checkout.page.ts`: helpers del flujo (llenar el formulario, pagar, volver a la tienda) con selectores accesibles (rol + nombre, etiqueta).
- `frontend/e2e/checkout.spec.ts`: un test por AC; cada uno verifica desbordamiento, errores de consola y `localStorage` (AC-007-05).
- `frontend/e2e/tsconfig.json`: el `typecheck` del front también revisa los E2E.

## CI
Job `e2e` en `.github/workflows/ci.yml`, en paralelo con `verify`: `npm ci`, `npx playwright install --with-deps`, `npm run e2e`; `actions/upload-artifact` con `playwright-report/` cuando falla (`if: failure()`), retención 14 días.

## Scripts (`frontend/package.json`, con atajos en la raíz)
- `e2e`: los tres navegadores, sin ventana.
- `e2e:headed`: Chromium con ventana y `slowMo` (variable `E2E_SLOWMO`, 500 ms por defecto) para mostrarlo en vivo.
- `e2e:ui`: modo UI de Playwright.
- `e2e:report`: abre el último reporte HTML.
