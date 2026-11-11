# ADR 0005 — CD con un usuario IAM dedicado (plan B a OIDC)

- Estado: aceptada (2026-11-11). Reemplaza la parte de credenciales del [ADR 0004](0004-cd-oidc.md).

## Contexto

La primera opción para que GitHub Actions despliegue en AWS era **OIDC** (ADR 0004). GitHub
emite un token de corta duración por ejecución, AWS lo cambia por credenciales temporales de un
rol cuya confianza solo admite el environment `production` de este repo, y no hay ningún secreto
de larga duración que pueda filtrarse ni rotar.

Al aplicar `infra/github-oidc.yaml` (stack `checkout-challenge-cicd`, us-east-2), CloudFormation
falló al crear `AWS::IAM::OIDCProvider`. El **SCP de la organización** tiene un *explicit deny*
sobre `iam:CreateOpenIDConnectProvider`. Lo mismo pasa con `iam:GetOpenIDConnectProvider` e
`iam:ListOpenIDConnectProviders`, que ya fallaban desde el usuario de despliegue con
`AccessDenied … with an explicit deny in a service control policy`. Un SCP no se puede saltar
desde la cuenta. Se borró el stack.

## Decisión

Plan B: un **usuario IAM dedicado**, `checkout-ci-deployer`, definido en `infra/ci-deployer.yaml`.

- Sus llaves de acceso se crean a mano en la consola y solo se guardan como secretos
  `AWS_ACCESS_KEY_ID` y `AWS_SECRET_ACCESS_KEY` del environment `production` de GitHub.
- `deploy.yml` las usa con `aws-actions/configure-aws-credentials`.
- Se mantiene el resto del diseño del ADR 0004: el job `deploy` tras todas las etapas de la CI,
  el rol de ejecución de CloudFormation y el smoke test.

## Mitigaciones

| Riesgo de una llave de larga duración | Mitigación |
|---|---|
| Alguien la usa fuera del CD | Solo existe como secreto del environment `production`. Ese environment solo admite la rama `main`, protegida (checks requeridos y revisión de IA), y los jobs de `deploy` también comprueban `refs/heads/main`. Los PR de forks no reciben secretos. |
| Si se filtra, el daño es grande | **Mínimo privilegio** en dos capas. El usuario solo puede crear y ejecutar change sets del stack `checkout-challenge`, hacer `iam:PassRole` del rol de ejecución hacia CloudFormation, subir el artefacto de la Lambda y el SPA a sus dos buckets e invalidar CloudFront. No puede tocar Lambda, API Gateway ni IAM directamente: eso lo hace el rol `checkout-challenge-cfn-exec`, limitado a los recursos `checkout-challenge-*`, que no puede modificarse a sí mismo ni al usuario (`Deny` explícito). |
| La llave se autoperpetúa | El usuario tiene un `Deny` sobre `iam:CreateAccessKey`, `UpdateAccessKey`, `DeleteAccessKey`, `CreateLoginProfile`, `AttachUserPolicy` y `PutUserPolicy`. No tiene acceso a la consola. |
| La llave envejece | **Rotación cada 90 días** o ante cualquier sospecha. Se crea la llave nueva, se actualizan los dos secretos, se lanza `Deploy` a mano (`workflow_dispatch` en `main`), se desactiva la anterior y después se borra. IAM permite dos llaves activas, así que la rotación no corta el CD. |
| Uso no detectado | CloudTrail registra cada llamada del usuario, y "Último uso" en IAM muestra si la llave se usa fuera de las ventanas de despliegue. |

## Riesgo residual aceptado

El rol de ejecución puede crear roles `checkout-challenge-*` con políticas inline. Quien tenga las
llaves podría pasarle a CloudFormation una plantilla que cree un rol `checkout-challenge-x` con
`*:*`. No se añade un *permissions boundary* porque:

- Las llaves solo existen en el environment `production` (solo `main`, protegida). Quien puede
  usarlas ya controla `infra/template.yaml` y puede desplegar lo que quiera por la vía normal.
- El `Deny` impide que el rol se amplíe a sí mismo, al usuario o a su política. Las políticas
  gestionadas adjuntables son una lista cerrada.
- Añadir el boundary obliga a migrar el rol existente de la Lambda
  (`PutRolePermissionsBoundary`) en el mismo despliegue que estrena el CD.

Si el repo pasa a tener más personas con acceso a `main`, este es el siguiente endurecimiento:
una política `checkout-challenge-boundary` y la condición `iam:PermissionsBoundary` en
`CreateRole`, `PutRolePolicy` y `AttachRolePolicy`.

## Consecuencias

- Si en el futuro el SCP permite OIDC, se vuelve al ADR 0004: se crea el proveedor y el rol, se
  borra el usuario y `deploy.yml` cambia dos líneas.
- `infra/ci-deployer.yaml` se aplica a mano una vez (stack `checkout-ci-deployer`) con
  `CAPABILITY_NAMED_IAM`. Los tests estáticos de `ci-deployer.spec.ts` impiden que la política
  crezca en silencio (sin comodines en el usuario y sin `iam:*` en el rol).
