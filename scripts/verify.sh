#!/usr/bin/env bash
# Quality gate. Exits non-zero if any check fails.
#   scripts/verify.sh          full gate (used by `ship`, CI)
#   VERIFY_FAST=1 verify.sh    pre-commit: skips builds and npm audit (CI still runs them)
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
FAST="${VERIFY_FAST:-0}"
FAILED=()

step() { printf '\n\033[1;34m▶ %s\033[0m\n' "$1"; }
run() { # run <label> <cmd...>
  local label="$1"; shift
  step "$label"
  if "$@"; then printf '\033[32m✔ %s\033[0m\n' "$label"; else FAILED+=("$label"); printf '\033[31m✘ %s\033[0m\n' "$label"; fi
}

for pkg in backend frontend; do
  run "$pkg: lint"            npm --prefix "$pkg" run --silent lint
  run "$pkg: typecheck"       npm --prefix "$pkg" run --silent typecheck
  # Coverage thresholds (>= 80%) are enforced by each package's Jest config.
  run "$pkg: tests + coverage" npm --prefix "$pkg" run --silent test:cov -- --ci --silent
  if [[ "$FAST" != "1" ]]; then
    run "$pkg: build"         npm --prefix "$pkg" run --silent build
    run "$pkg: npm audit"     npm --prefix "$pkg" audit --audit-level=high
  fi
done

secrets_scan() {
  if ! command -v gitleaks >/dev/null 2>&1; then
    echo "gitleaks not installed locally — skipped (CI runs it)."; return 0
  fi
  if [[ "$FAST" == "1" ]]; then
    gitleaks git --staged --pre-commit --redact --no-banner .
  else
    gitleaks git --redact --no-banner . && gitleaks dir --redact --no-banner \
      $(git ls-files --cached --others --exclude-standard)
  fi
}
run "secrets scan (gitleaks)" secrets_scan

forbidden_word() {
  if [[ -z "${FORBIDDEN_WORD:-}" ]]; then
    echo "FORBIDDEN_WORD is not set. Export it (never write it in a file) and re-run."; return 1
  fi
  local hits=0
  # Tracked + new (not ignored) files, file names included.
  if git ls-files --cached --others --exclude-standard -z | xargs -0 grep -Iil -- "$FORBIDDEN_WORD" 2>/dev/null; then hits=1; fi
  if git ls-files --cached --others --exclude-standard | grep -i -- "$FORBIDDEN_WORD"; then hits=1; fi
  if git branch -a --format='%(refname:short)' | grep -i -- "$FORBIDDEN_WORD"; then hits=1; fi
  if git log --all --format='%H %s %b' 2>/dev/null | grep -i -- "$FORBIDDEN_WORD" | cut -c1-12; then hits=1; fi
  if git remote -v | grep -i -- "$FORBIDDEN_WORD"; then hits=1; fi
  [[ $hits -eq 0 ]] || { echo "Forbidden word found (see above)."; return 1; }
}
run "forbidden word" forbidden_word

echo
if [[ ${#FAILED[@]} -gt 0 ]]; then
  printf '\033[31mverify FAILED:\033[0m\n'; printf '  - %s\n' "${FAILED[@]}"; exit 1
fi
printf '\033[32mverify OK\033[0m\n'
