# AGENTS.md

Guía para cualquier agente de IA (Claude Code, Codex, Cursor, Copilot…) que trabaje en este repo.
Antes de escribir código, lee este archivo, `docs/contexto.md` y la spec en la que vas a trabajar.

## Producto

Checkout móvil de un producto pagado con tarjeta de crédito a través de una pasarela de pago (sandbox).
Flujo de 5 pantallas:

1. Producto (stock, descripción, precio)
2. Modal con tarjeta y datos de entrega
3. Resumen en backdrop: producto + tarifa base + envío
4. Resultado del pago
5. Vuelta al producto con el stock actualizado

Si el usuario recarga la página, la app recupera el paso en el que iba.

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | React + Vite + TypeScript, Redux Toolkit (persistido), CSS con flexbox/grid, mobile-first (mín. iPhone SE 375×667) |
| Backend | NestJS + TypeScript, arquitectura hexagonal (puertos y adaptadores), Railway Oriented Programming |
| Base de datos | PostgreSQL + Prisma, con seed de productos (no hay endpoint para crear productos) |
| Tests | Jest, cobertura > 80 % en front y back |
| Docs API | Swagger (`@nestjs/swagger`) en `/docs` |
| Nube | AWS: front en S3 + CloudFront; back en Lambda (fuera de VPC) + API Gateway; BD en Neon (branches `dev` y `prod`, SSL). Plan B: back en Render |

## Reglas no negociables (constitución)

1. **Nada de lógica de negocio en los controladores.** Controlador → caso de uso → puertos. El dominio no importa NestJS ni Prisma.
2. **ROP:** los casos de uso devuelven `Result<T, DomainError>` y nunca lanzan excepciones por errores de negocio. El controlador traduce el `Result` a HTTP.
3. **Cobertura > 80 %** en cada paquete. Si baja, no se hace commit.
4. **Trazabilidad:** cada criterio de aceptación `AC-XXX-YY` tiene al menos un test con ese ID en su nombre.
5. **Datos sensibles:**
   - La tarjeta se tokeniza contra la pasarela. El número completo y el CVC nunca se guardan, nunca se loguean y nunca se persisten en localStorage.
   - Solo se guardan la marca y los últimos 4 dígitos.
6. **Secretos solo en variables de entorno** (`.env`, ignorado por git). Hay un `.env.example` sin valores reales.
7. **Nombre prohibido:** el nombre comercial de la pasarela no aparece en ningún archivo, commit, rama ni nombre del repo. Usa "payment gateway" o `gateway`.
8. **HTTP correcto:**
   - Códigos: 201 al crear, 400/422 si la validación falla, 404, 409 sin stock, 502 si la pasarela falla.
   - Los DTOs se validan con class-validator.
9. **Stock consistente:** el stock se descuenta en una transacción de BD solo cuando el pago queda APPROVED, nunca baja de 0, y hay idempotencia por referencia.
10. **Commits convencionales** (`feat:`, `fix:`, `test:`, `chore:`, `docs:`): una rama y un PR por spec.

## Estructura

```
backend/src/
  domain/          entidades, value objects, errores, puertos (interfaces)
  application/     casos de uso (devuelven Result)
  infrastructure/  adaptadores: prisma/, gateway/, http/ (controladores, DTOs)
frontend/src/
  app/             store, hooks
  features/        product/, checkout/, payment/ (slice + componentes + tests)
  shared/          ui/, utils/ (validación Luhn, detección de marca)
specs/NNN-nombre/  spec.md · plan.md · tasks.md
scripts/           verify.sh · trace.ts
docs/              contexto.md · adr/
```

## Flujos de trabajo

### `spec <nombre>`
Crea `specs/NNN-nombre/spec.md` con:
- objetivo,
- alcance y fuera de alcance,
- criterios de aceptación con IDs `AC-NNN-01…` en formato Dado / Cuando / Entonces,
- casos borde.

Luego `plan.md` (diseño, puertos, endpoints, modelo) y `tasks.md` (tareas de ≤ 1 h, cada una con los AC que cubre).

### `ship <NNN>`
1. Lee `spec.md`, `plan.md` y `tasks.md` de la spec.
2. `git checkout -b feat/NNN-nombre`.
3. Por cada tarea:
   - escribe el test primero, con el ID del AC en el nombre;
   - implementa;
   - corre `scripts/verify.sh`;
   - haz el commit y marca la tarea en `tasks.md`.
4. `npx tsx scripts/trace.ts` debe pasar.
5. Abre el PR con la plantilla: enlace a la spec, AC cubiertos y salida de verify.

### `verify`
Ejecuta `scripts/verify.sh`. Si algo falla, corrige y repite antes de seguir. No desactives ni saltes ninguna verificación.

## Comandos

```bash
scripts/verify.sh                  # puerta de calidad completa
npx tsx scripts/trace.ts           # matriz criterios → tests
cd backend && npm run test:cov
cd frontend && npm run test:cov
cd backend && npx prisma migrate dev && npx prisma db seed
```

## Lo que un agente NO debe hacer

- Hacer push sin que se lo pidan.
- Leer, imprimir o commitear `.env`.
- Debilitar tests o umbrales de cobertura para que algo pase.
- Agregar dependencias pesadas sin justificarlas en el PR.
