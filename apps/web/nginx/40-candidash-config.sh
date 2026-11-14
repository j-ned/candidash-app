#!/bin/sh
# Lancé par l'entrypoint de l'image nginx avant le serveur : écrit dans /tmp/candidash le config.json
# du front et les en-têtes de sécurité (connect-src = origine de l'API) depuis les variables du
# conteneur. Une variable absente ou mal formée arrête le démarrage.
#   API_URL            obligatoire, ex. https://api-candidash.example.fr/api/v1
#   EXTENSION_ID       facultatif, identifiant de l'extension Chrome (32 lettres de a à p)
#   FIREFOX_ADDON_URL  facultatif, fiche de l'extension sur addons.mozilla.org
set -eu

fail() { echo "candidash-config : $1" >&2; exit 1; }

# Les valeurs finissent dans du JSON et dans un en-tête : seuls les caractères d'une URL simple
# passent (ni guillemet, ni espace, ni retour à la ligne, ni point-virgule).
url() {
  case "$2" in
    *[!A-Za-z0-9.:/_~-]*) fail "$1 contient un caractère interdit" ;;
    http://?*|https://?*) ;;
    *) fail "$1 doit commencer par http:// ou https://" ;;
  esac
}

[ -n "${API_URL:-}" ] || fail "API_URL obligatoire"
url API_URL "$API_URL"
config="\"apiUrl\": \"$API_URL\""

if [ -n "${EXTENSION_ID:-}" ]; then
  case "$EXTENSION_ID" in
    *[!a-p]*) fail "EXTENSION_ID : 32 lettres de a à p attendues" ;;
  esac
  [ "${#EXTENSION_ID}" -eq 32 ] || fail "EXTENSION_ID : 32 lettres de a à p attendues"
  config="$config, \"extensionId\": \"$EXTENSION_ID\""
fi

if [ -n "${FIREFOX_ADDON_URL:-}" ]; then
  url FIREFOX_ADDON_URL "$FIREFOX_ADDON_URL"
  config="$config, \"firefoxAddonUrl\": \"$FIREFOX_ADDON_URL\""
fi

out=/tmp/candidash
mkdir -p "$out"
printf '{ %s }\n' "$config" > "$out/config.json"

origin=$(printf '%s' "$API_URL" | sed -E 's#^(https?://[^/]+).*#\1#')
sed "s#__API_ORIGIN__#$origin#" /etc/nginx/candidash/security-headers.conf.template > "$out/security-headers.conf"

echo "candidash-config : API $origin"
