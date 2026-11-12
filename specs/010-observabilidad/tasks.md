# 010 · Tareas

- [x] T1 — Redacción y logger JSON a stdout con niveles, `LOG_LEVEL` y `requestId` del contexto (AC-010-05, AC-010-07)
- [x] T2 — Middleware `x-request-id` + log de acceso `http.request`, cableado en `configure-app`, `main` y `lambda`, CORS expone el header (AC-010-01, AC-010-02, AC-010-03, AC-010-04, AC-010-10)
- [x] T3 — Puerto `PaymentEvents`, evento `payment.finalized` en `ApplyTransactionResult` y en el ERROR de la pasarela, adaptador de log (AC-010-08, AC-010-09)
- [x] T4 — Test de no fuga de tarjeta en stdout para approved, 400, 422 y 502 (AC-010-06)
- [x] T5 — Plantilla: filtros de métricas, alarmas, dashboard, X-Ray y output (AC-010-11, AC-010-12, AC-010-13, AC-010-14)
- [x] T6 — README: secciones "Observabilidad" y "Pipeline CI/CD"
- [x] T7 — Capturas del dashboard en el README, tras el primer despliegue por CD (release v1.2.0)
