---
name: verify
description: Ejecuta la puerta de calidad scripts/verify.sh (lint, typecheck, tests con cobertura ≥80 %, build, gitleaks, nombre prohibido, npm audit) y corrige hasta que pase. Úsala cuando pidan "verify", antes de cada commit de ship o antes de abrir un PR.
---

# verify

Corre la puerta de calidad completa desde la raíz del repo:

```bash
scripts/verify.sh
```

## Qué revisa (backend y frontend)
1. `lint`
2. `typecheck`
3. Tests con cobertura; los umbrales del 80 % los aplica la config de Jest de cada paquete.
4. `build`
5. `npm audit --audit-level=high`
6. Escaneo de secretos con `gitleaks`; si no está instalado en local se omite y lo corre la CI.
7. Búsqueda del nombre prohibido, leído de la variable `FORBIDDEN_WORD`, en archivos, nombres de archivo, ramas, commits y remotos.

Termina con código distinto de 0 si algo falla y lista los pasos fallidos al final.

## Requisitos
- `FORBIDDEN_WORD` exportada en el shell. Si falta, el paso falla a propósito: pide a la persona que la exporte y **nunca** escribas la palabra en un archivo, comando o commit.
- Si npm falla por permisos de `~/.npm`, usa `export npm_config_cache=$HOME/.npm-cache-alt`.

## Si falla
- Corrige la causa y vuelve a correr `scripts/verify.sh` hasta que pase.
- **Prohibido**: desactivar o saltar pasos, bajar umbrales de cobertura, debilitar tests, `git commit --no-verify` o excluir archivos de la cobertura para que pase.

## Variante rápida
`scripts/verify.sh <sección>…` corre solo esas secciones (`lint`, `typecheck`, `test-backend`, `test-frontend`, `build`, `security`); cada etapa de la CI usa una, así que para reproducir un job rojo corre su sección.

`VERIFY_FAST=1 scripts/verify.sh` omite builds y `npm audit`. La usa el hook de pre-commit de Husky; no reemplaza la verificación completa antes de un PR.
