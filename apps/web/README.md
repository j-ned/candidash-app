# Candidash Web (Angular · Vercel)

Front Angular 22 (zoneless, signals, Tailwind 4) de Candidash. Présentation complète du projet :
[README racine](../../README.md) ; conventions de code : [CLAUDE.md](CLAUDE.md).

## Développement

```bash
pnpm start       # http://localhost:4200
pnpm test        # Vitest (jsdom, @analogjs/vite-plugin-angular)
pnpm lint        # ESLint angular-eslint
pnpm build       # build de production + prérendu des pages publiques
```

L'URL de l'API est lue au démarrage dans `public/config.json` (chargé au runtime, pas figé au
build) : `http://localhost:3000/api/v1` en local, donc lancer l'API avec `PORT=3000 pnpm dev:api`.

## Production (Vercel)

Le build (`dist/ng-candidash-app/browser`) est servi en statique par Vercel (`vercel.json` : en-têtes
de sécurité, cache, coquille CSR pour les routes non prérendues). Après `ng build`,
`scripts/csp-hashes.mjs` pose dans chaque page une CSP des scripts par empreintes SHA-256 (pas de
nonce sans serveur) ; avant, `scripts/runtime-config.mjs` écrit `config.json` depuis `API_URL`,
`EXTENSION_ID` et `FIREFOX_ADDON_URL`. `ci/verify-build.sh` contrôle le résultat en CI.
