#!/usr/bin/env bash
# Conteneur réel : nginx non-root, en-tête CSP présent, nonce de la page = nonce de l'en-tête.
# Usage : ci/smoke.sh <image>
set -euo pipefail
image=${1:?image attendue}

docker run -d --name front -p 8080:80 -e API_URL=https://api.example.test/api/v1 "$image" > /dev/null
trap 'docker rm -f front > /dev/null' EXIT

for _ in $(seq 1 20); do
  curl -sf -o /dev/null http://localhost:8080/ && break
  sleep 0.5
done

test "$(docker exec front id -u)" != "0"
curl -sf -D headers.txt -o page.html http://localhost:8080/
nonce=$(grep -i '^content-security-policy' headers.txt | grep -oE "nonce-[a-f0-9]+" | head -1 | cut -d- -f2)
test -n "$nonce"
grep -qi "connect-src 'self' https://api.example.test" headers.txt
grep -q "nonce=\"$nonce\"" page.html
! grep -q 'CSP_NONCE' page.html
curl -sf http://localhost:8080/config.json | grep -q '"apiUrl":"https://api.example.test/api/v1"'

# Aperçu PDF : iframe sur un blob local
grep -qi "frame-src blob:" headers.txt
# Route sans page prérendue : coquille CSR (pas l'accueil prérendu), jamais en cache
curl -sf -D route-headers.txt -o route.html http://localhost:8080/dashboard
! grep -q 'ng-server-context="ssg"' route.html
grep -qi '^cache-control: no-cache' route-headers.txt

# Cache : immutable pour un chunk haché, un jour pour une URL fixe (favicon)
chunk=$(grep -oE 'src="[^"]*main-[A-Za-z0-9_-]{8}\.js"' page.html | head -1 | cut -d'"' -f2)
curl -sf -D chunk-headers.txt -o /dev/null "http://localhost:8080/${chunk#/}"
grep -qi '^cache-control: public, max-age=31536000, immutable' chunk-headers.txt
curl -sf -D favicon-headers.txt -o /dev/null http://localhost:8080/favicon.svg
grep -qi '^cache-control: public, max-age=86400' favicon-headers.txt
grep -qi '^x-content-type-options: nosniff' favicon-headers.txt

echo "test de fumée OK"
