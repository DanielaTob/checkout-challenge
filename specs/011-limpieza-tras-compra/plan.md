# 011 · Plan

## Front
- `ResultScreen`: **Volver a la tienda** decide según el estado final de la transacción:
  - `APPROVED` → `resetPayment()` + `resetCheckout()` (sin `keepDelivery`): el checkout vuelve a `initialCheckoutState` y `cardSession` se limpia por su `extraReducer` de `resetCheckout`.
  - `DECLINED`/`ERROR` → `resetPayment()` + `resetCheckout({ keepDelivery })`, como hasta ahora.
  - **Intentar de nuevo** no cambia: `resetPayment()` + `goToStep('details')` (la entrega sigue en el estado).
- Persistencia: redux-persist guarda el nuevo estado (whitelist `checkout` y `payment`), así que `localStorage` queda con el checkout inicial y el pago `idle`. No hace falta purgar la clave: la forma persistida sigue siendo válida para `migratePersistedState` y la recarga posterior arranca en producto.
- Sin cambios en slices de pago, thunks, API ni backend.

## Pruebas
- Jest (`ResultScreen.test.tsx`): AC-011-01 (estado inicial completo tras APPROVED), AC-011-04 y AC-011-05 (DECLINED/ERROR conservan la entrega).
- Jest con el store real persistido (`app/clearAfterPurchase.test.tsx`): AC-011-02 (lo escrito en `localStorage` tras APPROVED no tiene entrega ni transacción; tras DECLINED sí conserva la entrega) y AC-011-03 (modal vacío al empezar otra compra).
- Playwright (`e2e/clear-after-purchase.spec.ts`): compra aprobada → volver → `localStorage` sin datos de entrega → nueva compra con el modal vacío, también tras recargar (AC-011-02, AC-011-03); rechazada → **Intentar de nuevo** con la entrega cargada (AC-011-04) y **Volver a la tienda** que la conserva (AC-011-05).
