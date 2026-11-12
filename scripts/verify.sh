#!/usr/bin/env bash
# Quality gate. Exits non-zero if any check fails.
#   scripts/verify.sh                 full gate (used by `ship`)
#   VERIFY_FAST=1 scripts/verify.sh   pre-commit: skips builds and npm audit (CI still runs them)
#   scripts/verify.sh <section>...    only some sections; each CI stage calls one, so the
#                                     logic lives here once (Husky, `ship` and CI share it)
# Sections: lint, typecheck, test-backend, test-frontend, build, security
#   (security = gitleaks + forbidden word + npm audit), plus the finer audit, secrets, forbidden.
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
FAST="${VERIFY_FAST:-0}"
FAILED=()
PACKAGES=(backend frontend)

step() { printf '\n\033[1;34m▶ %s\033[0m\n' "$1"; }
run() { # run <label> <cmd...>
  local label="$1"; shift
  step "$label"
  if "$@"; then printf '\033[32m✔ %s\033[0m\n' "$label"; else FAILED+=("$label"); printf '\033[31m✘ %s\033[0m\n' "$label"; fi
}

secrets_scan() {
  if ! command -v gitleaks >/dev/null 2>&1; then
    echo "gitleaks not installed locally — skipped (CI runs it)."; return 0
  fi
  if [[ "$FAST" == "1" ]]; then
    gitleaks git --staged --pre-commit --redact --no-banner .
  else
    # `gitleaks dir` takes a single path, so copy only what git would track (tracked +
    # untracked-not-ignored) to a temp dir. Ignored files like backend/.env are never scanned.
    local tmp rc
    tmp="$(mktemp -d)"
    git ls-files -z --cached --others --exclude-standard | tar --null -T - -cf - | tar -xf - -C "$tmp"
    gitleaks git --redact --no-banner . && gitleaks dir --redact --no-banner "$tmp"
    rc=$?
    rm -rf "$tmp"
    return $rc
  fi
}

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

section() {
  local pkg
  case "$1" in
    lint)          for pkg in "${PACKAGES[@]}"; do run "$pkg: lint" npm --prefix "$pkg" run --silent lint; done ;;
    typecheck)     for pkg in "${PACKAGES[@]}"; do run "$pkg: typecheck" npm --prefix "$pkg" run --silent typecheck; done ;;
    # Coverage thresholds (>= 80%) are enforced by each package's Jest config.
    test-backend)  run "backend: tests + coverage"  npm --prefix backend  run --silent test:cov -- --ci --silent ;;
    test-frontend) run "frontend: tests + coverage" npm --prefix frontend run --silent test:cov -- --ci --silent ;;
    build)         for pkg in "${PACKAGES[@]}"; do run "$pkg: build" npm --prefix "$pkg" run --silent build; done ;;
    audit)         for pkg in "${PACKAGES[@]}"; do run "$pkg: npm audit" npm --prefix "$pkg" audit --audit-level=high; done ;;
    secrets)       run "secrets scan (gitleaks)" secrets_scan ;;
    forbidden)     run "forbidden word" forbidden_word ;;
    security)      section secrets; section forbidden; section audit ;;
    *) echo "Unknown section: $1 (lint, typecheck, test-backend, test-frontend, build, security, audit, secrets, forbidden)"; exit 2 ;;
  esac
}

SECTIONS=" lint typecheck test-backend test-frontend build security audit secrets forbidden "
if [[ $# -gt 0 ]]; then
  # Validate every argument before running anything.
  for s in "$@"; do
    [[ "$SECTIONS" == *" $s "* ]] || { echo "Unknown section: $s (${SECTIONS# })"; exit 2; }
  done
  for s in "$@"; do section "$s"; done
else
  section lint
  section typecheck
  section test-backend
  section test-frontend
  if [[ "$FAST" != "1" ]]; then section build; section audit; fi
  section secrets
  section forbidden
fi

echo
if [[ ${#FAILED[@]} -gt 0 ]]; then
  printf '\033[31mverify FAILED:\033[0m\n'; printf '  - %s\n' "${FAILED[@]}"; exit 1
fi
printf '\033[32mverify OK\033[0m\n'
