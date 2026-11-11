#!/usr/bin/env bash
# Prints a Markdown coverage line for a package (CI step summary). Usage: ci-coverage-summary.sh <pkg>
set -euo pipefail
pkg="$1"; f="$pkg/coverage/coverage-summary.json"
echo "## Cobertura $pkg"
if [[ -f "$f" ]]; then
  node -e "const t=require('./$f').total;console.log('lines '+t.lines.pct+'% · branches '+t.branches.pct+'% · functions '+t.functions.pct+'% · statements '+t.statements.pct+'%')"
else
  echo "sin datos (los tests fallaron antes de la cobertura)"
fi
