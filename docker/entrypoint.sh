#!/bin/sh
set -eu

# Configuration runtime lue par le front (config.json) : API_URL, et EXTENSION_ID /
# FIREFOX_ADDON_URL si définis.
API_URL="${API_URL:-http://localhost:3000/api/v1}"
CONFIG="\"apiUrl\":\"${API_URL}\""
[ -n "${EXTENSION_ID:-}" ] && CONFIG="${CONFIG},\"extensionId\":\"${EXTENSION_ID}\""
[ -n "${FIREFOX_ADDON_URL:-}" ] && CONFIG="${CONFIG},\"firefoxAddonUrl\":\"${FIREFOX_ADDON_URL}\""
echo "{${CONFIG}}" > /usr/share/nginx/html/config.json

# connect-src autorise l'origine de l'API (schéma + hôte + port), déduite d'API_URL.
API_ORIGIN=$(echo "$API_URL" | sed -E 's#^(https?://[^/]+).*#\1#')

# $request_id reste littéral ici : nginx le résout à chaque requête (nonce CSP).
cat > /etc/nginx/conf.d/security-headers.inc <<HEADERS
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'nonce-\$request_id'; style-src 'self' 'nonce-\$request_id'; img-src 'self' data:; font-src 'self'; media-src 'self'; connect-src 'self' ${API_ORIGIN}; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;
HEADERS

exec nginx -g "daemon off;"
