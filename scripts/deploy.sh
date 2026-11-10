#!/usr/bin/env bash
# Deploys the whole stack (API on Lambda + SPA on S3/CloudFront) with CloudFormation.
#   scripts/deploy.sh            build, deploy infra, migrate + seed, upload SPA, smoke test
# Requirements: `aws configure` done, backend/.env.production present (never committed).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
STACK="${STACK_NAME:-checkout-challenge}"
REGION="${AWS_REGION:-us-east-2}"
ENV_FILE="backend/.env.production"
export AWS_REGION="$REGION" AWS_PAGER=""

[[ -f "$ENV_FILE" ]] || { echo "Missing $ENV_FILE"; exit 1; }
# Load with the dotenv parser (values may contain & or ?), never echo them.
eval "$(cd backend && node -e '
const p=require("dotenv").parse(require("fs").readFileSync(".env.production"));
const q=s=>"\x27"+String(s).replace(/\x27/g,"\x27\\\x27\x27")+"\x27";
for (const [k,v] of Object.entries(p)) console.log("export "+k+"="+q(v));')"
for v in DATABASE_URL GATEWAY_BASE_URL GATEWAY_PUBLIC_KEY GATEWAY_PRIVATE_KEY GATEWAY_INTEGRITY_SECRET GATEWAY_EVENTS_SECRET BASE_FEE_IN_CENTS DELIVERY_FEE_IN_CENTS; do
  [[ -n "${!v:-}" ]] || { echo "Missing $v in $ENV_FILE"; exit 1; }
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
aws cloudformation deploy --stack-name "$STACK" --template-file .build/packaged.yaml \
  --capabilities CAPABILITY_IAM --no-fail-on-empty-changeset \
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
aws cloudfront create-invalidation --distribution-id "$DIST" --paths /index.html >/dev/null

echo "▶ smoke test"
curl -fsS --max-time 30 "$API_URL/health" && echo
curl -fsS -o /dev/null -w "  SPA HTTP %{http_code}\n" --max-time 30 "$WEB_URL"

cat <<SUMMARY

✔ deployed
  API      $API_URL   (Swagger: $API_URL/docs)
  Frontend $WEB_URL
SUMMARY
