#!/usr/bin/env bash
# Garanties de l'image du front, jugées sur les réponses HTTP du conteneur : mêmes règles que
# l'ancien service Vercel « web » (en-têtes de sécurité, caches, repli SPA, 404 des assets), et
# configuration écrite au démarrage depuis les variables du conteneur.
# Usage : ci/verify-image.sh <image>
set -euo pipefail
image=${1:?image attendue}
name="candidash-verify-web-$$"
tmp=$(mktemp -d)

API_URL=https://api.candidash.example.test/api/v1
API_ORIGIN=https://api.candidash.example.test
EXTENSION_ID=abcdefghijklmnopabcdefghijklmnop
FIREFOX_ADDON_URL=https://addons.mozilla.org/firefox/addon/candidash-exemple/

cleanup() { docker rm -f "$name" >/dev/null 2>&1 || true; rm -rf "$tmp"; }
trap cleanup EXIT
fail() { echo "ÉCHEC : $1" >&2; exit 1; }

# Une configuration absente ou mal formée arrête le conteneur au lieu de servir un front cassé.
refuses() {
  local label=$1; shift
  if timeout 20 docker run --rm "$@" "$image" nginx -t >/dev/null 2>&1; then fail "l'image démarre $label"; fi
}
refuses "sans API_URL"
refuses "avec une API_URL qui injecte du JSON" -e 'API_URL=https://x.test/", "apiUrl": "https://pirate.test'
refuses "avec une API_URL qui injecte un en-tête" -e 'API_URL=https://x.test; script-src *'
refuses "avec un EXTENSION_ID mal formé" -e "API_URL=$API_URL" -e 'EXTENSION_ID=pas-un-identifiant'

docker run -d --name "$name" -p 127.0.0.1::8080 \
  -e "API_URL=$API_URL" -e "EXTENSION_ID=$EXTENSION_ID" -e "FIREFOX_ADDON_URL=$FIREFOX_ADDON_URL" "$image" >/dev/null
port=$(docker port "$name" 8080/tcp | head -1 | sed 's/.*://')
base="http://127.0.0.1:$port"
for _ in $(seq 1 30); do curl -fsS -o /dev/null "$base/config.json" 2>/dev/null && break; sleep 1; done

# status <chemin> ; header <chemin> <en-tête> (valeur sans retour chariot)
status() { curl -s -o /dev/null -w '%{http_code}' "$base$1"; }
header() { curl -s -o /dev/null -D - "$base$1" | tr -d '\r' | awk -F': ' -v h="$2" 'tolower($1) == tolower(h) { print $2 }'; }
expect() { test "$2" = "$3" || fail "$1 : « $2 », attendu « $3 »"; }

IMMUTABLE='public, max-age=31536000, immutable'

# Pages : prérendues servies sans redirection, HTML toujours revalidé.
for page in / /features /features/ /contact /terms-of-service /extension-privacy; do
  expect "statut de $page" "$(status "$page")" 200
  expect "cache de $page" "$(header "$page" Cache-Control)" no-cache
done
curl -s "$base/features" -o "$tmp/features.html"
curl -s "$base/index.csr.html" -o "$tmp/csr.html"
cmp -s "$tmp/features.html" "$tmp/csr.html" && fail "/features sert la coquille CSR au lieu de la page prérendue"

# Route de l'application sans page prérendue : coquille CSR.
curl -s "$base/dashboard/candidatures/42" -o "$tmp/route.html"
expect "statut d'une route d'application" "$(status /dashboard/candidatures/42)" 200
cmp -s "$tmp/route.html" "$tmp/csr.html" || fail "une route d'application ne sert pas index.csr.html"

# En-têtes de sécurité, y compris sur une erreur.
for path in / /absent.js; do
  case "$(header "$path" Content-Security-Policy)" in
    *"connect-src 'self' $API_ORIGIN;"*"frame-ancestors 'none'"*) ;;
    *) fail "CSP absente, incomplète ou sans l'origine de l'API sur $path" ;;
  esac
  expect "X-Frame-Options de $path" "$(header "$path" X-Frame-Options)" DENY
  expect "X-Content-Type-Options de $path" "$(header "$path" X-Content-Type-Options)" nosniff
  expect "HSTS de $path" "$(header "$path" Strict-Transport-Security)" 'max-age=31536000; includeSubDomains'
done
test -z "$(header / Server | grep -E '[0-9]')" || fail "la version de nginx est exposée"

# Bundle à empreinte : immuable et compressé. Asset absent : 404 non mis en cache, jamais du HTML.
bundle=$(grep -o 'src="main-[A-Za-z0-9_-]\{8\}\.js"' "$tmp/csr.html" | head -1 | sed 's/src="\(.*\)"/\1/')
test -n "$bundle" || fail "bundle main introuvable dans index.csr.html"
expect "statut de /$bundle" "$(status "/$bundle")" 200
expect "cache de /$bundle" "$(header "/$bundle" Cache-Control)" "$IMMUTABLE"
expect "compression de /$bundle" \
  "$(curl -s -o /dev/null -D - -H 'Accept-Encoding: gzip' "$base/$bundle" | tr -d '\r' | awk -F': ' 'tolower($1) == "content-encoding" { print $2 }')" gzip
for missing in /absent.js /main-AAAAAAAA.js /icons/absent.svg /fonts/absent.woff2; do
  expect "statut de $missing" "$(status "$missing")" 404
  expect "cache de $missing" "$(header "$missing" Cache-Control)" no-cache
done

# Icônes : immuables seulement avec leur empreinte en ?v=. Polices : 30 jours.
expect "cache de /icons/sprite.svg?v=abc" "$(header '/icons/sprite.svg?v=abc' Cache-Control)" "$IMMUTABLE"
expect "cache de /icons/sprite.svg" "$(header /icons/sprite.svg Cache-Control)" no-cache
expect "cache des polices" "$(header /fonts/outfit-latin.woff2 Cache-Control)" 'public, max-age=2592000, stale-while-revalidate=86400'

# Configuration lue au démarrage du front : celle des variables du conteneur, jamais mise en cache.
expect "cache de /config.json" "$(header /config.json Cache-Control)" no-cache
expect "type de /config.json" "$(header /config.json Content-Type)" application/json
expect "config.json" \
  "$(curl -s "$base/config.json" | node -pe 'const c = JSON.parse(require("fs").readFileSync(0, "utf8")); [c.apiUrl, c.extensionId, c.firefoxAddonUrl].join(" ")')" \
  "$API_URL $EXTENSION_ID $FIREFOX_ADDON_URL"

test "$(docker exec "$name" id -u)" != 0 || fail "le conteneur tourne en root"

echo "image web vérifiée"
