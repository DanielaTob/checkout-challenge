---
name: spec
description: Crea una spec nueva con SDD en specs/NNN-nombre/ (spec.md con AC-NNN-YY en Dado/Cuando/Entonces, plan.md y tasks.md con tareas de ≤1 h). Úsala cuando pidan "spec <nombre>", una funcionalidad nueva o criterios de aceptación.
---

# spec `<nombre>`

Crea la especificación de una funcionalidad **antes** de escribir código. No implementes nada en esta skill.

## 1. Número y carpeta
- Toma el siguiente `NNN` libre en `specs/` (tres dígitos: `001`, `002`…).
- Crea `specs/NNN-nombre/` con el nombre en kebab-case y sin el nombre comercial de la pasarela.
- Agrega la fila a la tabla de `specs/README.md` con estado **Borrador** (y actualiza el contrato de API si la spec agrega endpoints).

## 2. `spec.md`
Secciones, en este orden:
1. **Objetivo**: una o dos frases.
2. **Alcance** y **Fuera de alcance**.
3. **Criterios de aceptación**: cada uno con ID `AC-NNN-YY` (`YY` desde `01`, sin huecos ni repetidos) en formato *Dado … cuando … entonces …*. Agrúpalos por Backend / Frontend si aplica. Cada AC debe poder verificarse con un test automatizado y nombrar los códigos HTTP exactos (201, 400/422, 404, 409, 502).
4. **Casos borde**.

## 3. `plan.md`
Diseño técnico respetando la arquitectura de `AGENTS.md`: entidades y puertos del dominio, casos de uso (devuelven `Result<T, DomainError>`), adaptadores (Prisma, pasarela, HTTP), endpoints y DTOs, cambios al modelo de datos, estado y componentes del front, y estrategia de pruebas.

## 4. `tasks.md`
Lista de casillas `- [ ] Tn — descripción (AC-NNN-YY, …)`:
- cada tarea dura **≤ 1 h**;
- cada tarea dice qué AC cubre;
- entre todas cubren **todos** los AC de la spec.

## 5. Revisión
- `npx tsx scripts/trace.ts --spec NNN` debe listar todos los AC (fallarán por falta de tests: es lo esperado).
- Muestra la spec a la persona y espera su OK antes de pasar a `ship`.
- Commit: `docs(specs): add NNN-nombre spec`.
