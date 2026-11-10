# 004 · Tareas

- [x] T0 — Probar el sandbox con curl: merchants, tokens, transactions, estado; anotar endpoints y tarjetas de prueba en `docs/adr/0003-contrato-pasarela.md`
- [x] T1 — Migración (`idempotency_key`, `shipping`, `failure_reason`, email único) (AC-004-02)
- [x] T2 — Customer: dominio, repo, `CreateCustomer`, controlador (AC-004-01)
- [ ] T3 — `validateCard` en dominio y `integritySignature` (AC-004-05, AC-004-06)
- [ ] T4 — Adaptador HTTP de la pasarela con timeouts y mapeo de errores (AC-004-07, AC-004-13)
- [ ] T5 — Repositorio de transacciones: `createPendingIfStock` con bloqueo de fila (AC-004-03, AC-004-21)
- [ ] T5b — Repositorio de transacciones: `applyResult` atómico e idempotente, ERROR por stock solo en la carrera (AC-004-09, AC-004-10, AC-004-11, AC-004-12)
- [ ] T6 — `CreateTransaction` + `PollTransactionStatus` (AC-004-02, AC-004-03, AC-004-04, AC-004-08, AC-004-13)
- [ ] T7 — `TransactionsController` (POST/GET) + DTOs + Swagger (AC-004-02, AC-004-05, AC-004-14)
- [ ] T8 — `GetDelivery` + controlador (AC-004-15)
- [ ] T9 — Test de no fuga de datos de tarjeta (AC-004-16)
- [ ] T10 — Front: `paymentSlice` + thunks `payTransaction` / `pollTransaction` (AC-004-18, AC-004-20)
- [ ] T11 — Front: `ResultScreen` y Volver a la tienda (AC-004-17, AC-004-19)
