# 003 · Plan

## Backend
- **Dominio** `domain/pricing/quote.ts`: función pura `buildQuote(product, quantity, fees): Result<Quote, DomainError>` (`OUT_OF_STOCK` si `quantity > stock`). La reutiliza `CreateTransaction` (004).
- **Puerto** `FeesProvider` (`getFees(): { baseFeeInCents, deliveryFeeInCents }`), adaptador que lee `ConfigService`.
- **Aplicación** `application/products/quote-checkout.use-case.ts`.
- **HTTP** `GET /products/:id/quote` con `QuoteQueryDto` (`@Type(() => Number) @IsInt @Min(1) @Max(10)`).

## Frontend
- `features/payment/quoteSlice.ts` (no persistido) con thunk `fetchQuote({ productId, quantity })`.
- `features/payment/SummarySheet.tsx`: backdrop (overlay + sheet con `transform: translateY` y transición), `QuantityStepper.tsx`, `MaskedCard.tsx`.
- **Pagar** despacha `payTransaction` (thunk de la spec 004); el guard contra doble toque se hace con `condition` del thunk (no dispara si `status === 'paying'`).

## Pruebas
- Unit de `buildQuote` (montos, stock, límites).
- Controlador con supertest: 200/400/404/409.
- RTL: desglose, máscara, stepper, doble toque, 409, editar.
