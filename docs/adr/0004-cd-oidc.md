# ADR 0004 — CD con GitHub Actions y OIDC

- Estado: aceptada (2026-11-11)

## Contexto

Hasta v1.1.0 el despliegue era manual (`scripts/deploy.sh` desde el portátil, usuario IAM con
AdministratorAccess). Queremos que cada merge a `main` se despliegue solo, con la CI en verde y
sin guardar llaves de AWS en GitHub.

## Decisión

- **Disparo:** job `deploy` al final de `ci.yml` (`needs: [e2e, security, trace]`, solo en push a
  `main`) que llama al workflow reutilizable `deploy.yml`. Así "CI en verde" es una dependencia
  explícita y el despliegue aparece como una etapa más. `workflow_run` se descartó: corre en el
  contexto de la rama por defecto (`develop`) y chocaría con el environment limitado a `main`.
- **Credenciales:** OIDC. `infra/github-oidc.yaml` (stack `checkout-challenge-cicd`, se aplica una
  vez a mano) crea el proveedor OIDC y dos roles:
  - `checkout-challenge-github-deploy`: solo lo puede asumir `repo:DanielaTob/checkout-challenge:environment:production`.
    Permisos: change sets del stack de la app, `iam:PassRole` del rol de ejecución, subir artefactos
    y el SPA a sus buckets e invalidar CloudFront.
  - `checkout-challenge-cfn-exec`: rol de servicio de CloudFormation que crea y actualiza los
    recursos, limitado a los del proyecto (`checkout-challenge-*`).
- **Secretos del backend:** secretos del environment `production` en GitHub (los mismos valores que
  `backend/.env.production`). `deploy.sh` los toma del entorno si no existe el archivo.
- **Smoke test:** `scripts/smoke-test.sh` comprueba `/health` y que `index.html` cargue un script de
  entrada que apunte a la API desplegada (una vez un 200 ocultó una página en blanco).

## Consecuencias

- **Riesgo aceptado:** el rol de ejecución puede crear roles `checkout-challenge-*` con políticas
  inline. Quien mergea a `main` ya controla la plantilla, así que un permissions boundary no
  cambia el techo de confianza para un proyecto de una persona. Los dos roles del CD quedan
  protegidos con un `Deny` explícito, y las políticas gestionadas que se pueden adjuntar son una
  lista cerrada.
- **Restricción a `main`:** está en tres sitios. La regla de ramas del environment `production`,
  el `if` del job `deploy` (en `ci.yml` y en `deploy.yml`) y la confianza OIDC (`sub` del
  environment).
- **Si el smoke test falla tras desplegar:** el job queda en rojo y la versión nueva ya está
  publicada. Para volver atrás, PR de `git revert` del merge en `main` (hotfix); su merge
  redespliega la versión anterior. CloudFormation solo hace rollback solo si falla el propio
  `deploy`.

- Un fallo de permisos del rol de ejecución hace rollback del stack; los permisos se amplían en
  `infra/github-oidc.yaml` y se re-aplica el bootstrap.
- `deploy.sh` local sigue funcionando (con o sin `CFN_EXEC_ROLE_ARN`).
