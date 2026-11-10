# Contexto del proyecto

Lo leen los agentes al iniciar una sesión. Resume los requisitos de la prueba y las decisiones ya tomadas.

## Requisitos clave de la prueba

- SPA en React con Redux, mobile-first, responsive.
- API en NestJS con hexagonal y ROP; la lógica va fuera de los controladores.
- La API maneja cuatro recursos: **stock/productos, transacciones, clientes y entregas**, con distintos tipos de request.
- BD con productos de ejemplo precargados (seed).
- Tests con Jest: **> 80 %** en front y back, con los resultados en el README.
- Despliegue en la nube, con front y back conectados.
- README con:
  - modelo de datos,
  - Swagger o Postman público,
  - resultados de cobertura.
- Pasarela de pago **solo en modo sandbox**, con las llaves de prueba que vienen en el PDF de la prueba, guardadas únicamente en `.env`.
- Repo público en GitHub, **sin el nombre de la pasarela**, con commits frecuentes y PRs por funcionalidad.

## Rúbrica (mínimo 100 puntos)

| Puntos | Qué se evalúa |
|---|---|
| 5 | README |
| 5 | Imágenes rápidas, sin desbordes de UI |
| 20 | Flujo de checkout completo |
| 20 | API correcta |
| 30 | Cobertura > 80 % (front y back) |
| 20 | Desplegado en la nube |

**Bonos:**
- OWASP, HTTPS y headers de seguridad: 5
- Responsive y multi-navegador: 5
- CSS: 10
- Clean code: 10
- Hexagonal: 10
- ROP: 10

## Decisiones tomadas

| Tema | Decisión | ADR |
|---|---|---|
| BD | Neon (Postgres serverless) para dev y prod, con dos branches: `dev` y `prod`. Conexión con `sslmode=require` | [0001](adr/0001-neon-y-lambda.md) |
| Back | NestJS en AWS Lambda con `@codegenie/serverless-express`, detrás de API Gateway (HTTP API). Lambda **fuera de la VPC** para tener salida a internet hacia la pasarela y Neon | [0001](adr/0001-neon-y-lambda.md) |
| Front | Build de Vite en S3 privado + CloudFront (OAC, HTTPS) | [0001](adr/0001-neon-y-lambda.md) |
| Plan B | Si a las 9 p. m. del día 1 el back en Lambda no funciona, se despliega en Render (misma BD Neon) | [0001](adr/0001-neon-y-lambda.md) |
| Herramientas | `gitleaks` y `awscli` instalados con brew; las credenciales de AWS las configura la persona con `aws configure` | — |

## Flujo de negocio

1. `GET /products` devuelve el producto con su stock.
2. El usuario llena tarjeta y entrega. Se valida con Luhn, fecha y CVC, y se detecta la marca (VISA o MasterCard).
3. Se muestra el resumen: producto + tarifa base fija + envío.
4. Al pagar:
   1. `POST /transactions` crea la transacción en PENDING y devuelve su ID y referencia.
   2. El backend obtiene el acceptance token: `GET /merchants/{public_key}`.
   3. Se tokeniza la tarjeta con `POST /tokens/cards` (llave pública).
   4. Se crea la transacción en la pasarela con la firma de integridad: `sha256(reference + amountInCents + currency + integritySecret)`.
   5. Se consulta el estado hasta que sea final: APPROVED, DECLINED o ERROR.
   6. Si quedó APPROVED, se actualiza la transacción, se crea la entrega y se descuenta el stock, todo en una sola transacción de BD.
5. Se muestra el resultado y se vuelve al producto con el stock actualizado.

Verifica en la documentación oficial de la pasarela los endpoints exactos y las tarjetas de prueba del sandbox (una aprobada y una rechazada).

## Variables de entorno (`.env.example`)

```
GATEWAY_BASE_URL=
GATEWAY_PUBLIC_KEY=
GATEWAY_PRIVATE_KEY=
GATEWAY_INTEGRITY_SECRET=
GATEWAY_EVENTS_SECRET=
DATABASE_URL=
BASE_FEE_IN_CENTS=
DELIVERY_FEE_IN_CENTS=
```

## Modelo de datos inicial

- **products**: `id, name, description, image_url, price_in_cents, stock, created_at, updated_at`
- **customers**: `id, full_name, email, phone, created_at`
- **transactions**: `id, reference (unique), product_id, customer_id, quantity, amount_in_cents, base_fee_in_cents, delivery_fee_in_cents, status (PENDING|APPROVED|DECLINED|ERROR), gateway_transaction_id, card_brand, card_last4, created_at, updated_at`
- **deliveries**: `id, transaction_id (unique), customer_id, address, city, region, postal_code, status, created_at`

## Specs previstas

| Spec | Nombre | Qué cubre |
|---|---|---|
| 001 | catalogo-stock | Listar productos y su stock |
| 002 | tarjeta-entrega | Modal, validaciones y marca de la tarjeta |
| 003 | resumen-pago | Backdrop con el desglose de montos |
| 004 | transaccion-pasarela | PENDING → pasarela → estado final, entrega y stock |
| 005 | resiliencia | Recuperar el paso tras un refresh; persistencia sin datos sensibles |
| 006 | despliegue | AWS, HTTPS y headers de seguridad |

## Plan (2 días)

**Día 1**
- Repo y scaffold.
- AGENTS.md y specs.
- `verify.sh`, `trace.ts`, husky y CI.
- Modelo de datos.
- Probar el sandbox con `curl`.
- Desplegar el esqueleto.

**Día 2**
- Dos agentes en paralelo con `git worktree` (backend / frontend).
- Integración.
- Tests > 80 %.
- Despliegue final.
- README y envío.

**Orden si hay atraso:** flujo funcionando → desplegado → cobertura → README → CSS y bonos.

## Riesgos

| Riesgo | Plan |
|---|---|
| AWS (IAM, CORS, RDS) | Desplegar temprano. Si falla, back en Render o Railway |
| Firma o tokens del sandbox | Probarlos con `curl` antes de escribir el adaptador |
| Perfeccionismo | Los bonos van al final |
