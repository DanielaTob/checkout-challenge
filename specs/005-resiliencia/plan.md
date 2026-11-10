# 005 · Plan

## Frontend
- `persistConfig`: `version: 2`, `whitelist: ['checkout', 'payment']`, `migrate` con `createMigrate` (versiones viejas → estado inicial).
- Rehidratación: un componente `StepRouter` decide la pantalla según `step` + `cardSession`:
  - `summary` sin `cardSession` → `details` + aviso.
  - `result` con `PENDING` → arranca `pollTransaction`.
  - `paying` (petición en vuelo) → `GET /transactions/by-key/:key`.
- `idempotencyKey = crypto.randomUUID()` generado al tocar Pagar y persistido **antes** de enviar la petición.
- Test de "no fuga": recorrer el flujo con `user-event` y revisar `localStorage` tras cada paso.

## Backend
- `CreateTransaction` consulta primero `findByIdempotencyKey`; compara `productId`/`quantity`/`customerId` → `CONFLICT` si difieren.
- `GET /transactions/by-key/:key` (`GetTransactionByKey`).
- Adaptador de pasarela: `AbortSignal.timeout(8000)`; helper `retry(fn, { retries: 2, onlyIdempotent: true })` usado solo en `getTransaction`.
