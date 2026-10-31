#!/usr/bin/env bash
# Front servi comme en production (Worker + Static Assets sous wrangler dev) : en-tête CSP présent,
# nonce de la page = nonce de l'en-tête, coquille CSR, cache et config.json.
# Usage : ci/smoke.sh <url de base>   (wrangler dev lancé avec --var API_URL:https://api.example.test/api/v1)
set -euo pipefail
base=${1:?url de base attendue}
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
cd "$work"

for _ in $(seq 1 60); do
  curl -sf -o /dev/null "$base/config.json" && break
  sleep 1
done

curl -sf -D headers.txt -o page.html "$base/"
nonce=$(grep -i '^content-security-policy' headers.txt | grep -oE "nonce-[a-f0-9]+" | head -1 | cut -d- -f2)
test -n "$nonce"
grep -qi "connect-src 'self' https://api.example.test" headers.txt
grep -q "nonce=\"$nonce\"" page.html
! grep -q 'CSP_NONCE' page.html
curl -sf "$base/config.json" | grep -q '"apiUrl":"https://api.example.test/api/v1"'

# Aperçu PDF : iframe sur un blob local
grep -qi "frame-src blob:" headers.txt
# Route sans page prérendue : coquille CSR (pas l'accueil prérendu), sans redirection, jamais en cache
curl -sf -D route-headers.txt -o route.html "$base/dashboard"
grep -qi '^HTTP/[0-9.]* 200' route-headers.txt
! grep -q 'ng-server-context="ssg"' route.html
grep -qi '^cache-control: no-cache' route-headers.txt

# Cache : immutable pour un chunk haché, un jour pour une URL fixe (favicon)
chunk=$(grep -oE 'src="[^"]*main-[A-Za-z0-9_-]{8}\.js"' page.html | head -1 | cut -d'"' -f2)
curl -sf -D chunk-headers.txt -o /dev/null "$base/${chunk#/}"
grep -qi '^cache-control: public, max-age=31536000, immutable' chunk-headers.txt
curl -sf -D favicon-headers.txt -o /dev/null "$base/favicon.svg"
grep -qi '^cache-control: public, max-age=86400' favicon-headers.txt
grep -qi '^x-content-type-options: nosniff' favicon-headers.txt
grep -qi '^strict-transport-security:' favicon-headers.txt

echo "test de fumée OK"
