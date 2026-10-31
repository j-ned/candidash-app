# Candidash

Suivi de candidatures : tableau de bord, relances par email, CV et lettres, extension navigateur.

| Dossier | Contenu | Production |
|---|---|---|
| [`apps/web`](apps/web) | Front Angular 22 (zoneless, Tailwind 4), pages publiques prérendues | Cloudflare Workers Static Assets — `candidash.nedellec-julien.fr` |
| [`apps/api`](apps/api) | API Hono (Drizzle + Postgres via Hyperdrive, R2, Cron Triggers) | Cloudflare Workers — `api-candidash.nedellec-julien.fr` |

L'extension navigateur vit dans son propre dépôt (`chrome-candidash-extension`).

## Démarrer

```bash
pnpm install
docker run -d --name candidash-db -p 5432:5432 \
  -e POSTGRES_USER=candidash -e POSTGRES_PASSWORD=candidash -e POSTGRES_DB=candidash postgres:17
DATABASE_URL=postgresql://candidash:candidash@localhost:5432/candidash pnpm --filter api db:migrate
pnpm dev:api     # API sur http://localhost:8787 (wrangler dev ; .dev.vars, voir apps/api/README.md)
pnpm dev:web     # front sur http://localhost:4200
pnpm test        # tests des deux applications
```

Un seul lockfile et des réglages pnpm communs (`pnpm-workspace.yaml`) : délai de 14 jours avant
d'adopter une nouvelle version, peers optionnelles non installées d'office.

## Déploiement

La CI (`.github/workflows/ci.yml`) vérifie les deux applications sur chaque PR et déploie chacune
sur master, après approbation (environnement `production`). Mise en production initiale depuis
Dokploy : [docs/bascule.md](docs/bascule.md).
