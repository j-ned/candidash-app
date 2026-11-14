# Candidash Web (Angular · nginx)

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

## Production (image Docker, nginx)

Le build (`dist/ng-candidash-app/browser`) est servi en statique par nginx dans l'image
`candidash-web` (`Dockerfile`, `nginx/default.conf` : en-têtes de sécurité, cache, coquille CSR pour
les routes non prérendues, relais de `/api/` vers l'API). Après `ng build`, `scripts/csp-hashes.mjs`
pose dans chaque page une CSP des scripts par empreintes SHA-256 (pas de nonce sur des fichiers
statiques). Au démarrage du conteneur, `nginx/40-candidash-config.sh` écrit `config.json` depuis
`API_URL`, `EXTENSION_ID` et `FIREFOX_ADDON_URL`.

`ci/verify-build.sh` contrôle le build en CI, `ci/verify-image.sh` l'image. Pile complète :
[deploy/README.md](../../deploy/README.md).
