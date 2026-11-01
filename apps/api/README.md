# Candidash API (Hono · Vercel)

Remplaçant de `nest-candidash-app` : mêmes routes `/api/v1`, même forme d'erreur, mêmes migrations
Drizzle. Fonction Node sur Vercel (Hono détecté sans configuration, `src/index.ts`), base Neon,
fichiers sur R2 (API S3).

## Développement

```bash
docker run -d --name candidash-db -p 5432:5432 \
  -e POSTGRES_USER=candidash -e POSTGRES_PASSWORD=candidash -e POSTGRES_DB=candidash postgres:17
cp .env.example .env
DATABASE_URL=postgresql://candidash:candidash@localhost:5432/candidash pnpm db:migrate
pnpm dev         # http://localhost:8787/api/v1 (même app que sur Vercel, variables de .env)
pnpm test        # intégration sous Node, app.request() contre ce Postgres
```

Sans SMTP configuré, les emails (codes de vérification, liens) s'affichent dans la console.

## Fonctionnement en production

- Bindings lus dans `process.env` (`src/node-env.ts`) ; les tests passent les leurs.
- Pool Postgres partagé par instance (`src/db/client.ts`), derrière le pooler de Neon.
- Limites de débit comptées en base (`LimitesDebit`, fenêtres d'une minute).
- SMTP par nodemailer : 465 en TLS implicite ou 587 avec STARTTLS exigé.
- Service Vercel `api` du `vercel.json` racine : `pnpm build` regroupe l'API et ses dépendances
  dans `dist/index.js` (esbuild), exposé par `server.js` ; le builder Services ne déploie pas
  `node_modules` et ne sait pas vérifier les types avec TypeScript 7.
- Cron Vercel quotidien (`vercel.json` racine) sur `GET /api/v1/cron/daily`, protégé par `CRON_SECRET` :
  relances réservées en base avant envoi (un cron déclenché deux fois n'envoie qu'une fois), puis
  purges. En local : `curl -H "Authorization: Bearer $CRON_SECRET" localhost:8787/api/v1/cron/daily`.

## Mise en production

Procédure pas à pas et réversible : [docs/bascule.md](../../docs/bascule.md).
