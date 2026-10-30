#!/usr/bin/env bash
# Garanties du build de production, jugées sur les fichiers que l'image sert.
# Usage : ci/verify-build.sh <dossier browser extrait de l'image>
set -euo pipefail
browser=${1:?dossier browser attendu}

# Pages publiques prérendues : accueil, démo, CGU, confidentialité de l'extension, contact.
for page in index.html features/index.html terms-of-service/index.html extension-privacy/index.html contact/index.html; do
  test -f "$browser/$page" || { echo "manquant : $page"; exit 1; }
done

# CSP stricte (nonce par requête) : tout inline posé par Angular porte le marqueur que nginx
# remplace ; un attribut style="" serait bloqué en prod (pas de 'unsafe-inline').
while IFS= read -r f; do
  if grep -oE '<(script|style)[^>]*>' "$f" | grep -v 'src=' | grep -v 'application/json' | grep -vq 'nonce="\*\*CSP_NONCE\*\*"'; then
    echo "inline sans nonce dans $f"; exit 1
  fi
  if grep -q ' style="' "$f"; then echo "attribut style dans $f"; exit 1; fi
done < <(find "$browser" -name 'index*.html')

echo "build vérifié"
