# ADR 0001 — Neon como BD y NestJS en AWS Lambda

- Estado: aceptada
- Fecha: 2026-11-10

## Contexto

La prueba pide desplegar el front y el back en la nube (20 puntos), idealmente en AWS, con PostgreSQL.
Hay dos días de plazo. RDS dentro de una VPC obliga a poner NAT Gateway para que la Lambda salga a internet
(la pasarela de pago es externa), lo que añade coste y configuración.

## Decisión

- **BD:** Neon (Postgres serverless), **una sola branch** compartida por desarrollo y producción (decisión revisada el 2026-11-10; originalmente eran dos branches). Conexión con SSL.
  Prisma usa la URL *pooled* en runtime para no agotar conexiones desde Lambda.
- **Back:** NestJS empaquetado como una sola Lambda con `@codegenie/serverless-express`, detrás de API Gateway HTTP API.
  La Lambda queda **fuera de la VPC**: tiene salida directa a internet hacia la pasarela y Neon.
  La instancia de Nest se cachea entre invocaciones para reducir el cold start.
- **Front:** build estático de Vite en un bucket S3 privado servido por CloudFront (OAC, HTTPS, headers de seguridad).
- **Región:** todo el stack de AWS va en **`us-east-2`**: la cuenta (AWS Builder ID nueva) tiene una SCP que solo permite esa región para servicios regionales; IAM, STS y CloudFront son globales. Neon se queda en `us-east-1`; la latencia entre ambas regiones (~10–15 ms por consulta) es aceptable para la demo.
- **Plan B:** si a las 9 p. m. del día 1 el back en Lambda no responde, se despliega en Render contra la misma BD Neon.

## Consecuencias

- Sin NAT Gateway ni VPC: menos coste y menos piezas que fallen.
- No usamos RDS; lo justificamos en el README.
- El adaptador HTTP de Nest no cambia entre local, Lambda y Render: solo cambia el punto de entrada (`main.ts` vs `lambda.ts`).
- Cold starts de Lambda: aceptables para una demo; se mitigan cacheando la app.
- Al compartir la base, las pruebas locales modifican los datos de producción (stock, transacciones). Es aceptable para una demo en sandbox; el seed es idempotente y no restablece el stock. Si hiciera falta aislarlos, basta con crear una branch de Neon y cambiar `DATABASE_URL` en `backend/.env.production`.
