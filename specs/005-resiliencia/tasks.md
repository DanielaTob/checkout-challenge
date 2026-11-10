# 005 · Tareas

- [x] T1 — Backend: idempotencia por `Idempotency-Key` en `CreateTransaction` (AC-005-09, AC-005-10)
- [x] T2 — Backend: `GET /transactions/by-key/:key` (AC-005-13)
- [x] T3 — Backend: timeout de 8 s y reintentos solo en GET de estado (AC-005-11, AC-005-12)
- [x] T3b — Backend: presupuesto total de ~15 s en `POST /transactions` (PENDING si no alcanza) (AC-005-14)
- [x] T3c — Backend: presupuesto de ~10 s para refrescar desde la pasarela en `GET /transactions/:id` y `by-key` (AC-005-15)
- [ ] T4 — Front: `persistConfig` con versión y migración (AC-005-07, AC-005-08)
- [ ] T5 — Front: `StepRouter` de rehidratación por paso (AC-005-01, AC-005-02, AC-005-03, AC-005-04)
- [ ] T6 — Front: pago en vuelo con `idempotencyKey` persistida (AC-005-05)
- [ ] T7 — Front: test de no fuga en `localStorage` en todo el flujo (AC-005-06)
