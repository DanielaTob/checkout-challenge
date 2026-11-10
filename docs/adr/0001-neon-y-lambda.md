# ADR 0001 — Neon como BD y NestJS en AWS Lambda

- Estado: aceptada
- Fecha: 2026-11-10

## Contexto

La prueba pide desplegar el front y el back en la nube (20 puntos), idealmente en AWS, con PostgreSQL.
Hay dos días de plazo. RDS dentro de una VPC obliga a poner NAT Gateway para que la Lambda salga a internet
(la pasarela de pago es externa), lo que añade coste y configuración.

## Decisión

- **BD:** Neon (Postgres serverless) para dev y prod, con dos branches (`dev`, `prod`). Conexión con SSL.
  Prisma usa la URL *pooled* en runtime para no agotar conexiones desde Lambda.
- **Back:** NestJS empaquetado como una sola Lambda con `@codegenie/serverless-express`, detrás de API Gateway HTTP API.
  La Lambda queda **fuera de la VPC**: tiene salida directa a internet hacia la pasarela y Neon.
  La instancia de Nest se cachea entre invocaciones para reducir el cold start.
- **Front:** build estático de Vite en un bucket S3 privado servido por CloudFront (OAC, HTTPS, headers de seguridad).
- **Plan B:** si a las 9 p. m. del día 1 el back en Lambda no responde, se despliega en Render contra la misma BD Neon.

## Consecuencias

- Sin NAT Gateway ni VPC: menos coste y menos piezas que fallen.
- No usamos RDS; lo justificamos en el README.
- El adaptador HTTP de Nest no cambia entre local, Lambda y Render: solo cambia el punto de entrada (`main.ts` vs `lambda.ts`).
- Cold starts de Lambda: aceptables para una demo; se mitigan cacheando la app.
