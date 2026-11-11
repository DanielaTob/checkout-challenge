#!/usr/bin/env bash
# Post-deploy smoke test. Usage: scripts/smoke-test.sh <api_url> <web_url>
# Checks the API answers /health and that the SPA really renders: an HTTP 200 alone once hid a
# blank production page, so it also loads the entry script and checks it points at this API.
set -euo pipefail
API_URL="${1:?api url}"; WEB_URL="${2:?web url}"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
fail() { echo "✘ smoke: $*"; exit 1; }
retry() { local i; for i in 1 2 3 4 5 6; do "$@" && return 0; sleep 10; done; return 1; }

echo "▶ smoke test"
retry curl -fsS --max-time 30 -o "$TMP/health.json" "$API_URL/health" || fail "$API_URL/health unreachable"
grep -Eq '"status"[[:space:]]*:[[:space:]]*"ok"' "$TMP/health.json" || fail "/health did not return status ok"
echo "  ✔ API /health ok"

retry curl -fsS --max-time 30 -o "$TMP/index.html" "$WEB_URL/" || fail "$WEB_URL unreachable"
grep -q 'id="root"' "$TMP/index.html" || fail "index.html has no #root"
entry="$(grep -oE 'src="/assets/[^"]+\.js"' "$TMP/index.html" | head -1 | cut -d'"' -f2)"
[[ -n "$entry" ]] || fail "index.html references no entry script"
curl -fsS --max-time 30 -o "$TMP/entry.js" "$WEB_URL$entry" || fail "entry script $entry not served"
grep -qF "$API_URL" "$TMP/entry.js" || fail "entry script does not point at $API_URL"
echo "  ✔ SPA ok ($entry, API $API_URL)"
