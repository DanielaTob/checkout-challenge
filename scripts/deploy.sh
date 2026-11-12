#!/usr/bin/env bash
# Deploys the whole stack (API on Lambda + SPA on S3/CloudFront) with CloudFormation.
#   scripts/deploy.sh            build, deploy infra, migrate + seed, upload SPA, smoke test
# Requirements: AWS credentials (`aws configure` locally; user checkout-ci-deployer in CI)
# and the backend variables, from backend/.env.production (never committed) or, in CI, from the
# environment (GitHub `production` environment secrets).
# Optional: CFN_EXEC_ROLE_ARN (CloudFormation service role from infra/ci-deployer.yaml).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
STACK="${STACK_NAME:-checkout-challenge}"
REGION="${AWS_REGION:-us-east-2}"
ENV_FILE="backend/.env.production"
export AWS_REGION="$REGION" AWS_PAGER=""

if [[ -f "$ENV_FILE" ]]; then
  # Load with the dotenv parser (values may contain & or ?), never echo them.
  eval "$(cd backend && node -e '
const p=require("dotenv").parse(require("fs").readFileSync(".env.production"));
const q=s=>"\x27"+String(s).replace(/\x27/g,"\x27\\\x27\x27")+"\x27";
for (const [k,v] of Object.entries(p)) console.log("export "+k+"="+q(v));')"
else
  echo "▶ $ENV_FILE not found: using variables from the environment"
fi
# An empty optional secret must not shadow DATABASE_URL in prisma.config.ts (`??`).
[[ -n "${DIRECT_DATABASE_URL:-}" ]] || unset DIRECT_DATABASE_URL
for v in DATABASE_URL GATEWAY_BASE_URL GATEWAY_PUBLIC_KEY GATEWAY_PRIVATE_KEY GATEWAY_INTEGRITY_SECRET GATEWAY_EVENTS_SECRET BASE_FEE_IN_CENTS DELIVERY_FEE_IN_CENTS; do
  [[ -n "${!v:-}" ]] || { echo "Missing $v ($ENV_FILE or environment)"; exit 1; }
done

ACCOUNT="$(aws sts get-caller-identity --query Account --output text)"
ARTIFACTS="${STACK}-artifacts-${ACCOUNT}-${REGION}"
echo "▶ account …${ACCOUNT: -4} · region $REGION · stack $STACK"

if ! aws s3api head-bucket --bucket "$ARTIFACTS" 2>/dev/null; then
  echo "▶ creating artifacts bucket"
  if [[ "$REGION" == "us-east-1" ]]; then aws s3api create-bucket --bucket "$ARTIFACTS" >/dev/null
  else aws s3api create-bucket --bucket "$ARTIFACTS" --create-bucket-configuration LocationConstraint="$REGION" >/dev/null; fi
  aws s3api put-public-access-block --bucket "$ARTIFACTS" --public-access-block-configuration \
    BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
fi

scripts/build-lambda.sh

echo "▶ cloudformation package + deploy"
aws cloudformation package --template-file infra/template.yaml --s3-bucket "$ARTIFACTS" \
  --s3-prefix backend --output-template-file .build/packaged.yaml >/dev/null
# In CI the user has no Lambda/API Gateway/IAM rights: without the execution role CloudFormation
# would fail late with an unclear AccessDenied, so fail fast instead.
if [[ "${GITHUB_ACTIONS:-}" == "true" ]]; then
  : "${CFN_EXEC_ROLE_ARN:?missing CFN_EXEC_ROLE_ARN (variable of the production environment)}"
fi
ROLE_ARGS=()
[[ -n "${CFN_EXEC_ROLE_ARN:-}" ]] && ROLE_ARGS=(--role-arn "$CFN_EXEC_ROLE_ARN")
aws cloudformation deploy --stack-name "$STACK" --template-file .build/packaged.yaml \
  --capabilities CAPABILITY_IAM --no-fail-on-empty-changeset ${ROLE_ARGS[@]+"${ROLE_ARGS[@]}"} \
  --parameter-overrides \
    "DatabaseUrl=$DATABASE_URL" "GatewayBaseUrl=$GATEWAY_BASE_URL" "GatewayPublicKey=$GATEWAY_PUBLIC_KEY" \
    "GatewayPrivateKey=$GATEWAY_PRIVATE_KEY" "GatewayIntegritySecret=$GATEWAY_INTEGRITY_SECRET" \
    "GatewayEventsSecret=$GATEWAY_EVENTS_SECRET" "BaseFeeInCents=$BASE_FEE_IN_CENTS" \
    "DeliveryFeeInCents=$DELIVERY_FEE_IN_CENTS"

out() { aws cloudformation describe-stacks --stack-name "$STACK" --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue" --output text; }
API_URL="$(out ApiUrl)"; WEB_URL="$(out FrontendUrl)"; BUCKET="$(out FrontendBucketName)"; DIST="$(out DistributionId)"

echo "▶ database: migrate deploy + seed (idempotent)"
(cd backend && npx prisma migrate deploy >/dev/null && npx prisma db seed >/dev/null)

echo "▶ frontend build + upload"
VITE_API_URL="$API_URL" npm --prefix frontend run --silent build >/dev/null
aws s3 sync frontend/dist "s3://$BUCKET" --delete --exclude index.html \
  --cache-control "public,max-age=31536000,immutable" >/dev/null
aws s3 cp frontend/dist/index.html "s3://$BUCKET/index.html" --cache-control "no-cache" >/dev/null
INVALIDATION="$(aws cloudfront create-invalidation --distribution-id "$DIST" --paths /index.html --query Invalidation.Id --output text)"
aws cloudfront wait invalidation-completed --distribution-id "$DIST" --id "$INVALIDATION"

# The deploy workflow runs the smoke test as its own step (SMOKE_TEST=0 here).
[[ "${SMOKE_TEST:-1}" == "0" ]] || scripts/smoke-test.sh "$API_URL" "$WEB_URL"
if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
  { echo "api_url=$API_URL"; echo "web_url=$WEB_URL"; } >> "$GITHUB_OUTPUT"
fi

cat <<SUMMARY

✔ deployed
  API      $API_URL   (Swagger: $API_URL/docs)
  Frontend $WEB_URL
SUMMARY
