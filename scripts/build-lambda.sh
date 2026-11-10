#!/usr/bin/env bash
# Builds the backend Lambda bundle at .build/backend-lambda.zip
# (compiled dist/ + production node_modules; the Prisma client is compiled into dist/generated).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/.build"
STAGE="$OUT/lambda"

rm -rf "$STAGE" "$OUT/backend-lambda.zip"
mkdir -p "$STAGE"

echo "▶ prisma generate + nest build"
npm --prefix "$ROOT/backend" run --silent prisma:generate >/dev/null
npm --prefix "$ROOT/backend" run --silent build

echo "▶ production dependencies"
cp -R "$ROOT/backend/dist" "$STAGE/dist"
cp "$ROOT/backend/package.json" "$ROOT/backend/package-lock.json" "$STAGE/"
# --ignore-scripts: postinstall (prisma generate) needs the dev-only CLI; the client is already in dist/.
# --omit=peer: npm would otherwise install @prisma/client's optional peers (prisma CLI, typescript…).
(cd "$STAGE" && npm ci --omit=dev --omit=peer --ignore-scripts --no-audit --no-fund >/dev/null)
node "$ROOT/scripts/prune-peers.cjs" "$STAGE"
# Only the PostgreSQL query compiler is used; drop the other engines' WASM builds.
find "$STAGE/node_modules/@prisma/client/runtime" -type f \
  \( -name '*cockroachdb*' -o -name '*mysql*' -o -name '*sqlite*' -o -name '*sqlserver*' \) -delete
find "$STAGE" -name '*.map' -delete
find "$STAGE/dist" -name '*.d.ts' -delete

echo "▶ zip"
(cd "$STAGE" && zip -qr "$OUT/backend-lambda.zip" .)
du -h "$OUT/backend-lambda.zip" | awk '{print "  bundle:", $1}'
du -sh "$STAGE" | awk '{print "  unzipped:", $1, "(Lambda limit 250 MB)"}'
