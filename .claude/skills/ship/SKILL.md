---
name: ship
description: Implementa una spec ya aprobada con TDD siguiendo GitFlow ligero (rama feat/NNN-nombre desde develop, un commit por tarea, verify en verde, trace en verde, PR de vuelta a develop). Úsala cuando pidan "ship <NNN>" o implementar una spec.
---

# ship `<NNN>`

Implementa la spec `specs/NNN-*/` tarea por tarea. **Nunca hagas `git push` ni abras el PR sin preguntar a la persona.**

## 1. Preparar
1. Lee `spec.md`, `plan.md` y `tasks.md` de la spec, además de `AGENTS.md` y `docs/contexto.md`.
2. Parte de `develop` actualizada:
   ```bash
   git checkout develop
   git pull --ff-only   # solo si hay remoto y la persona lo autorizó
   git checkout -b feat/NNN-nombre
   ```
   El nombre de la rama es el mismo que el de la carpeta de la spec.

## 2. Por cada tarea de `tasks.md` (en orden)
1. **Test primero**: escribe el test que falla, con el ID del AC en el nombre (`it('AC-004-09 …')`).
2. **Implementa** lo mínimo para que pase, respetando hexagonal y ROP (nada de lógica en controladores, el dominio no importa Nest ni Prisma).
3. **Verifica** con la skill `verify` (`scripts/verify.sh`). Si falla, corrige; no debilites tests ni umbrales.
4. **Marca** la tarea como `- [x]` en `tasks.md`.
5. **Commit** pequeño y convencional que incluya el cambio y la casilla marcada, p. ej. `feat(backend): apply approved transaction atomically`.

## 3. Cerrar
1. `npx tsx scripts/trace.ts --spec NNN` debe pasar (todos los AC con test).
2. Actualiza el estado de la spec en `specs/README.md` a **Implementada**.
3. Pregunta a la persona antes de subir la rama. Con su OK:
   ```bash
   git push -u origin feat/NNN-nombre
   gh pr create --base develop --fill-first --body-file <cuerpo según .github/pull_request_template.md>
   ```
   El cuerpo del PR lleva el enlace a la spec, la tabla de AC → tests y el resumen de `scripts/verify.sh`.
4. Espera la revisión de la IA (workflow `AI review`): atiende cada comentario con un commit o responde en el hilo justificando por qué no aplica. Sin revisión o con comentarios pendientes no se mergea.
5. El PR se integra en `develop` con merge commit (`gh pr merge --merge`), **nunca** `--squash`, para conservar el historial por tarea.

## Reglas
- Una spec = una rama = un PR hacia `develop`.
- `main` solo recibe PRs de release desde `develop` (o hotfix); `ship` nunca apunta a `main`.
