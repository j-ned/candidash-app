# CLAUDE.md

Monorepo pnpm : `apps/web` (front Angular 22) et `apps/api` (API Hono sur Cloudflare Workers).
Chaque application a ses propres conventions : lire `apps/web/CLAUDE.md` avant de toucher au front,
`apps/api/README.md` avant de toucher à l'API.

- Commandes depuis la racine : `pnpm --filter web <script>`, `pnpm --filter api <script>`,
  `pnpm test` (les deux). Un seul `pnpm-lock.yaml` à la racine ; jamais de lockfile dans `apps/*`.
- TypeScript diffère : 6.x pour le front (exigé par Angular), 7.x pour l'API. `packageExtensions`
  (pnpm-workspace.yaml) donne au plugin Vitest d'Analog le TypeScript du front.
- Les deux applications partagent l'API HTTP `/api/v1` : changer une route ou une forme de
  réponse, c'est mettre à jour le front (`apps/web/src/app/features/*/infra`) dans le même commit.
- Commits en français, conventional commits, portée `web` ou `api` quand une seule application
  est touchée (ex. `fix(api): …`).
