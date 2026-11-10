# ADR 0002 — Versiones de Nest, TypeScript y Prisma

- Estado: aceptada
- Fecha: 2026-11-10

## Contexto
La prueba exige Jest + ts-jest en front y back.
- NestJS 12 es **solo ESM** y su CLI genera el proyecto con Vitest. Jest sobre ESM requiere `--experimental-vm-modules` y es frágil con decoradores y mocks.
- ts-jest 29 declara `typescript >=4.3 <7`; Vite genera el front con TypeScript 7.
- La etiqueta `latest` de Prisma apunta a una RC (8.0.0-rc).
- npm 11.20 bloquea por defecto los install scripts de dependencias.

## Decisión
- Backend en **NestJS 11** (CommonJS), con Jest y ts-jest de serie.
- Front con **TypeScript 6.0**; backend con TypeScript 5.9 (el que trae Nest 11).
- **Prisma 7.10.1** (última estable), con `@prisma/adapter-pg` y cliente generado en `src/generated/prisma` (ignorado por git). Sin binario de query engine: más liviano para Lambda.
- `allowScripts` en `backend/package.json` aprueba solo `prisma`, `@prisma/engines` y `esbuild`; se niegan `@scarf/scarf` (telemetría) y `@parcel/watcher`.

## Consecuencias
- Si se migra a Nest 12 en el futuro, hay que pasar a ESM y a Vitest (fuera del alcance de la prueba).
