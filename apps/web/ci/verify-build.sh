#!/usr/bin/env bash
# Garanties du build de production, jugées sur les fichiers que l'image sert.
# Usage : ci/verify-build.sh <dossier browser extrait de l'image>
set -euo pipefail
browser=${1:?dossier browser attendu}

# Pages publiques prérendues : accueil, démo, CGU, confidentialité de l'extension, contact.
# Coquille CSR servie par le Worker pour les routes sans page prérendue.
for page in index.html index.csr.html features/index.html terms-of-service/index.html extension-privacy/index.html contact/index.html; do
  test -f "$browser/$page" || { echo "manquant : $page"; exit 1; }
done

# CSP par empreintes (scripts/csp-hashes.mjs) : chaque page porte son <meta> CSP, et chaque script
# inline exécutable y figure par son SHA-256 ; un attribut style="" serait bloqué en prod.
while IFS= read -r f; do
  meta=$(grep -o '<meta http-equiv="Content-Security-Policy"[^>]*>' "$f" || true)
  test -n "$meta" || { echo "CSP absente de $f"; exit 1; }
  node -e '
    const html = require("fs").readFileSync(process.argv[1], "utf8");
    const meta = process.argv[2];
    for (const [, attrs = "", body] of html.matchAll(/<script(\s[^>]*)?>([\s\S]*?)<\/script>/g)) {
      if (attrs.includes("src=") || /type="application\/(ld\+)?json"/.test(attrs)) continue;
      const hash = require("crypto").createHash("sha256").update(body).digest("base64");
      if (!meta.includes(`sha256-${hash}`)) { console.error(`script inline sans empreinte dans ${process.argv[1]}`); process.exit(1); }
    }' "$f" "$meta"
  if grep -q ' style="' "$f"; then echo "attribut style dans $f"; exit 1; fi
done < <(find "$browser" -name '*.html')

# Même garde dans les templates : un style="" n'apparaîtrait qu'au rendu, après navigation.
if grep -rn ' style="' src/app; then echo "attribut style dans un template"; exit 1; fi

echo "build vérifié"
