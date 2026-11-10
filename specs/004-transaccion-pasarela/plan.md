# 004 · Plan

## Modelo
Migración que agrega a `transactions`: `idempotency_key` (único, nullable), `shipping` (JSONB), `failure_reason` (nullable) y, a `customers`, índice único en `email`.

## Dominio
- `domain/customer/`: `Customer`, puerto `CustomerRepository { upsertByEmail(); findById() }`.
- `domain/transaction/`: `Transaction`, `TransactionStatus`, `isFinal(status)`, puerto `TransactionRepository`:
  - `createPendingIfStock(data): Result<Transaction, DomainError>`: en un `$transaction` hace `SELECT stock FROM products WHERE id = $p FOR UPDATE`; si `quantity > stock` → `OUT_OF_STOCK` (409) sin insertar; si alcanza, `INSERT` en PENDING.
  - `findById(id)`, `findByIdempotencyKey(key)`,
  - `markGatewayId(id, gatewayId)`,
  - `applyResult(id, outcome): Promise<Transaction>`: **atómico** (ver abajo).
- `domain/payment/`:
  - `card.ts`: `CardInput` (solo en memoria), `validateCard()` → `Result<{ brand, last4 }, DomainError>`.
  - `signature.ts`: `integritySignature(reference, amount, currency, secret)`.
  - puerto `PaymentGateway { getAcceptanceToken(); tokenizeCard(card); createTransaction(req); getTransaction(id) }`, todo con `Result<_, DomainError>` (`GATEWAY_ERROR`).
- `domain/delivery/`: `Delivery`, puerto `DeliveryRepository { findById() }`.

## Aplicación
- `CreateCustomer`.
- `CreateTransaction`: validar tarjeta → producto/cliente → `buildQuote` → `createPendingIfStock` (409 aquí) → gateway (token, tokenize, create) → `PollTransactionStatus` → `ApplyTransactionResult`. Se encadena con `andThenAsync`.
- `PollTransactionStatus` (intentos y espera inyectables para tests: `sleep` como puerto `Clock`).
- `ApplyTransactionResult`.
- `GetTransaction` (si PENDING → consulta y aplica), `GetDelivery`.

## `applyResult` atómico e idempotente (Prisma `$transaction`)
```
UPDATE transactions SET status = $final ... WHERE id = $id AND status = 'PENDING'
  → 0 filas: ya aplicado → devolver la transacción tal cual (idempotente)
si APPROVED:
  UPDATE products SET stock = stock - $q WHERE id = $p AND stock >= $q
    → 0 filas: solo pasa en la carrera (AC-004-12): rollback y guardar ERROR + OUT_OF_STOCK_AFTER_PAYMENT
  INSERT deliveries (... transaction_id UNIQUE)
```

## Infraestructura
- `gateway/http-payment-gateway.ts`: `fetch` con `AbortSignal.timeout(8000)`, llaves desde `ConfigService`, mapeo de respuestas a dominio. **Nunca** loguea el cuerpo de la petición de tokenización.
- `prisma/` repositorios.
- `http/`: `CustomersController`, `TransactionsController`, `DeliveriesController`, DTOs con class-validator. El DTO de tarjeta no tiene `toString`/serialización y se excluye de cualquier log.

## Frontend
- `features/payment/paymentSlice.ts` (persistido: `transactionId`, `status`, `reference`, `idempotencyKey`; sin datos de tarjeta).
- Thunks: `payTransaction` (customer → transaction), `pollTransaction`.
- `ResultScreen.tsx`, botón Volver → `resetCheckout` + `fetchProducts`.

## Pruebas
- Unit de cada caso de uso con dobles de los puertos (incluye todos los caminos del `Result`).
- Adaptador de pasarela con `fetch` mockeado (éxito, 4xx, 5xx, timeout).
- Repositorio Prisma: test de `applyResult` con Prisma mockeado (rama de 0 filas y rama de rollback).
- Controladores con supertest (todos los códigos).
- Test que espía el `Logger` y el repositorio para comprobar que el número y el CVC no aparecen (AC-004-16).
- RTL de la pantalla de resultado con timers falsos para el polling.
