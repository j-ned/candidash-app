#!/bin/sh
# Lancé par l'entrypoint de l'image nginx avant le serveur : écrit dans /tmp/candidash le config.json
# du front, les en-têtes de sécurité et l'adresse interne de l'API depuis les variables du conteneur.
# Une variable absente ou mal formée arrête le démarrage.
#   API_UPSTREAM       obligatoire, adresse interne de l'API relayée sous /api/, ex. http://candidash-api:3000
#   API_URL            facultatif, adresse de l'API vue du navigateur ; par défaut /api/v1 (même origine)
#   EXTENSION_ID       facultatif, identifiant de l'extension Chrome (32 lettres de a à p)
#   FIREFOX_ADDON_URL  facultatif, fiche de l'extension sur addons.mozilla.org
set -eu

fail() { echo "candidash-config : $1" >&2; exit 1; }

# Les valeurs finissent dans du JSON, dans un en-tête et dans la configuration de nginx : seuls les
# caractères d'une URL simple passent (ni guillemet, ni espace, ni retour à la ligne, ni point-virgule).
plain() {
  case "$2" in
    *[!A-Za-z0-9.:/_~-]*) fail "$1 contient un caractère interdit" ;;
  esac
}
absolute() {
  plain "$1" "$2"
  case "$2" in
    http://?*|https://?*) ;;
    *) fail "$1 doit commencer par http:// ou https://" ;;
  esac
}

[ -n "${API_UPSTREAM:-}" ] || fail "API_UPSTREAM obligatoire"
absolute API_UPSTREAM "$API_UPSTREAM"
case "${API_UPSTREAM#*://}" in
  */*) fail "API_UPSTREAM : une origine sans chemin attendue (http://hôte:port)" ;;
esac

API_URL="${API_URL:-/api/v1}"
case "$API_URL" in
  /*) plain API_URL "$API_URL"; connect_src="" ;;
  *) absolute API_URL "$API_URL"; connect_src=" $(printf '%s' "$API_URL" | sed -E 's#^(https?://[^/]+).*#\1#')" ;;
esac
config="\"apiUrl\": \"$API_URL\""

if [ -n "${EXTENSION_ID:-}" ]; then
  case "$EXTENSION_ID" in
    *[!a-p]*) fail "EXTENSION_ID : 32 lettres de a à p attendues" ;;
  esac
  [ "${#EXTENSION_ID}" -eq 32 ] || fail "EXTENSION_ID : 32 lettres de a à p attendues"
  config="$config, \"extensionId\": \"$EXTENSION_ID\""
fi

if [ -n "${FIREFOX_ADDON_URL:-}" ]; then
  absolute FIREFOX_ADDON_URL "$FIREFOX_ADDON_URL"
  config="$config, \"firefoxAddonUrl\": \"$FIREFOX_ADDON_URL\""
fi

out=/tmp/candidash
mkdir -p "$out"
printf '{ %s }\n' "$config" > "$out/config.json"
sed "s#__CONNECT_SRC__#$connect_src#" /etc/nginx/candidash/security-headers.conf.template > "$out/security-headers.conf"
printf 'set $candidash_api %s;\n' "$API_UPSTREAM" > "$out/api-upstream.conf"

echo "candidash-config : API $API_URL relayée vers $API_UPSTREAM"
