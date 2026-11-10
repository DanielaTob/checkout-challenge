Eres mi agente principal para una prueba técnica Full Stack que debo entregar MAÑANA en la noche. Trabajamos con Spec-Driven Development (SDD) y flujos agénticos. Lee todo antes de actuar.

## Objetivo
Checkout móvil de UN producto pagado con tarjeta de crédito usando una pasarela de pago en modo SANDBOX (sin dinero real). 5 pantallas:
1) Producto (stock, descripción, precio, imagen) → 2) botón "Pay with credit card" que abre un modal con tarjeta (validada con Luhn, fecha y CVC; detectar y mostrar logo VISA/MasterCard) y datos de entrega → 3) Resumen en un backdrop (Material) con producto + tarifa base fija + envío y botón Pagar → 4) Resultado del pago → 5) Vuelta al producto con el stock actualizado.
Si el usuario recarga la página, la app recupera el paso en el que iba.

## Stack (obligatorio)
- Frontend: SPA en React + TypeScript, con Vite SOLO como herramienta de build (nada de Next.js ni otros frameworks). Redux Toolkit + redux-persist. Mobile-first (mín. iPhone SE 375x667). CSS con flexbox/grid.
- Tests del front: Jest + React Testing Library (Jest configurado con ts-jest y jsdom; NO Vitest).
- Backend: NestJS + TypeScript, arquitectura hexagonal (puertos y adaptadores), Railway Oriented Programming: los casos de uso devuelven Result<T, DomainError>. Nada de lógica de negocio en los controladores. class-validator, helmet, @nestjs/swagger (Swagger en /docs).
- BD: PostgreSQL + Prisma, con seed de productos (sin endpoint para crear productos).
- Recursos de la API: productos/stock, transacciones, clientes y entregas, con distintos métodos HTTP.
- Tests con Jest, cobertura >80% en front Y back (vale 30 de los 100 puntos).
- Despliegue: front en AWS S3+CloudFront; back en AWS (Lambda o ECS + RDS). Plan B si AWS se complica: back en Render/Railway y Postgres en Neon.
- Calidad: Husky (pre-commit), GitHub Actions, gitleaks, scripts/verify.sh y scripts/trace.ts.

## Flujo de pago (backend)
POST /transactions crea la transacción en PENDING con una referencia única → obtiene el acceptance token (GET /merchants/{public_key}) → tokeniza la tarjeta (POST /tokens/cards) → crea la transacción en la pasarela con la firma de integridad sha256(reference+amountInCents+currency+integritySecret) → consulta el estado hasta que sea final (APPROVED/DECLINED/ERROR) → si quedó APPROVED, en una sola transacción de BD: actualiza la transacción, crea la entrega y descuenta el stock (nunca por debajo de 0, con idempotencia por referencia). Verifica los endpoints exactos y las tarjetas de prueba en la documentación oficial de la pasarela.

## Modelo de datos inicial
products(id, name, description, image_url, price_in_cents, stock, timestamps)
customers(id, full_name, email, phone, created_at)
transactions(id, reference unique, product_id, customer_id, quantity, amount_in_cents, base_fee_in_cents, delivery_fee_in_cents, status, gateway_transaction_id, card_brand, card_last4, timestamps)
deliveries(id, transaction_id unique, customer_id, address, city, region, postal_code, status, created_at)

## Reglas no negociables
1. El nombre comercial de la pasarela NO puede aparecer en ningún archivo, commit, rama ni en el nombre del repo. Usa "payment gateway" o "gateway".
2. Secretos solo en .env (en .gitignore). Crea .env.example sin valores: GATEWAY_BASE_URL, GATEWAY_PUBLIC_KEY, GATEWAY_PRIVATE_KEY, GATEWAY_INTEGRITY_SECRET, GATEWAY_EVENTS_SECRET, DATABASE_URL, BASE_FEE_IN_CENTS, DELIVERY_FEE_IN_CENTS. Yo pongo los valores reales.
3. Nunca guardes, loguees ni persistas en localStorage el número completo de la tarjeta ni el CVC. Solo la marca y los últimos 4 dígitos.
4. Cada criterio de aceptación lleva un ID AC-NNN-YY, y cada test incluye ese ID en su nombre.
5. Commits convencionales y pequeños; una rama y un PR por spec. NUNCA hagas git push sin preguntarme.
6. Códigos HTTP correctos: 201, 400/422, 404, 409 sin stock, 502 si falla la pasarela. Valida los DTOs y restringe CORS.

## Estructura
backend/src/{domain,application,infrastructure/{prisma,gateway,http}}
frontend/src/{app,features/{product,checkout,payment},shared/{ui,utils}}
specs/NNN-nombre/{spec.md,plan.md,tasks.md} · scripts/{verify.sh,trace.ts} · docs/{contexto.md,adr/}

## Flujos de trabajo que debes documentar en AGENTS.md
- spec <nombre>: crea spec.md (objetivo, alcance, AC con IDs en formato Dado/Cuando/Entonces, casos borde), luego plan.md y tasks.md (tareas de ≤1h, cada una con los AC que cubre).
- ship <NNN>: crea la rama feat/NNN-nombre → por cada tarea: test primero, implementación, scripts/verify.sh y commit → al final trace.ts en verde → PR con plantilla.
- verify: scripts/verify.sh corre lint, typecheck, tests con cobertura ≥80% por paquete, build de front y back, escaneo de secretos (gitleaks si está instalado), búsqueda del nombre prohibido (leído de la variable de entorno FORBIDDEN_WORD, nunca escrito en el código) y npm audit --audit-level=high. Si algo falla, termina con código distinto de 0.
- trace.ts: extrae todos los AC-NNN-YY de specs/*/spec.md, los busca en los archivos *.spec.ts(x) y *.test.ts(x), imprime una tabla Markdown AC | archivo | estado, y falla si a algún AC le falta su test.

## Specs previstas
001-catalogo-stock, 002-tarjeta-entrega, 003-resumen-pago, 004-transaccion-pasarela, 005-resiliencia, 006-despliegue

## Plan
Hoy: git init + scaffold, AGENTS.md (+ CLAUDE.md con "@AGENTS.md"), docs/contexto.md con este contexto, specs con AC, verify.sh, trace.ts, Husky pre-commit, GitHub Actions, PR template, probar el sandbox con curl y desplegar el esqueleto.
Mañana: backend y frontend en paralelo con git worktree → integración → tests >80% → despliegue final → README (arquitectura, modelo de datos en Mermaid, Swagger, tabla de cobertura, matriz de trazabilidad, URLs y la sección "Desarrollo asistido por IA") → envío.
Si vamos atrasados, la prioridad es: flujo funcionando > desplegado > cobertura > README > CSS y bonos.

## Ahora mismo
1. Muéstrame un plan corto de lo que harás hoy y espera mi OK.
2. Con mi OK: git init, scaffold de backend (Nest) y frontend (Vite React TS), AGENTS.md, CLAUDE.md, docs/contexto.md, .gitignore, .env.example, scripts/verify.sh, scripts/trace.ts, Husky y CI. Commits pequeños.
3. Después escribe las specs 001 a 005 con sus AC y me las muestras para revisarlas.
