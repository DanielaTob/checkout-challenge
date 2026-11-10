# 002 · Plan

## Utilidades puras (`frontend/src/shared/utils/card.ts`)
- `luhn(digits: string): boolean`
- `detectBrand(digits): 'VISA' | 'MASTERCARD' | null`
- `formatCardNumber(raw): string` / `onlyDigits(raw)`
- `isValidExpiry(mmYY, now = new Date()): boolean` (fecha inyectable para tests)
- `isValidCvc(cvc)`, `isValidHolder(name)`
- `validators.ts` para los campos de entrega (email, teléfono, postal…).
- El backend replica Luhn, marca y fecha en `domain/payment/card.ts` (lo usa la spec 004).

## Estado
- `checkoutSlice` (persistido): `delivery`, `customer`, `card: { brand, last4 } | null`.
- `cardSession` slice (**no persistido**, fuera del `whitelist`): `{ number, expMonth, expYear, cvc, holderName } | null`. Se limpia al cerrar el modal, al terminar el pago y en `resetCheckout`.

## Componentes (`features/checkout/`)
- `CheckoutModal.tsx`: contenedor `dialog` con foco inicial, Esc y ✕.
- `CardFields.tsx` con `BrandLogo.tsx` (SVG inline VISA/MC).
- `DeliveryFields.tsx`.
- `useFormFields` hook mínimo: valores, `touched`, errores derivados (sin librería de formularios).

## Pruebas
- Tabla de casos para cada utilidad (`it.each`).
- RTL con `user-event`: escribir, ver logo, errores al `blur`, botón deshabilitado, continuar, Esc.
- Test de que `cardSession` no está en el `whitelist` de persistencia.
