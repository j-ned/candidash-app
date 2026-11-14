# Candidash API (Hono · Node)

Remplaçant de `nest-candidash-app` : mêmes routes `/api/v1`, même forme d'erreur, mêmes migrations
Drizzle. En production, un serveur Node dans une image Docker (`src/main.ts`), devant un Postgres en
conteneur ; fichiers sur R2 (API S3). L'API n'a pas de domaine à elle : le front la relaie sous
`/api/`.

## Développement

```bash
docker run -d --name candidash-db -p 5432:5432 \
  -e POSTGRES_USER=candidash -e POSTGRES_PASSWORD=candidash -e POSTGRES_DB=candidash postgres:17
cp .env.example .env
DATABASE_URL=postgresql://candidash:candidash@localhost:5432/candidash pnpm db:migrate
pnpm dev         # http://localhost:8787/api/v1 (même app qu'en production, variables de .env)
pnpm test        # intégration sous Node, app.request() contre ce Postgres
```

Sans Resend ni SMTP configuré, les emails (codes de vérification, liens) s'affichent dans la console.

## Fonctionnement en production

- Bindings lus dans `process.env` (`src/node-env.ts`) ; les tests passent les leurs. Une variable
  manquante arrête le démarrage.
- Migrations en attente appliquées au démarrage, avant d'écouter (`src/main.ts`).
- Pool Postgres partagé par processus, 3 connexions (`src/db/client.ts`).
- Limites de débit comptées en base (`LimitesDebit`, fenêtres d'une minute). Derrière le tunnel
  Cloudflare, `CLIENT_IP_HEADER=cf-connecting-ip` désigne l'en-tête qui porte l'adresse du visiteur.
- Mail : API HTTP de Resend dès que `RESEND_API_KEY` et `MAIL_FROM` sont définis ; sinon SMTP par
  nodemailer, 465 en TLS implicite ou 587 avec STARTTLS exigé. En production, l'un des deux est
  obligatoire.
- Tâches quotidiennes : le service `candidash-cron` de la pile appelle `GET /api/v1/cron/daily` à
  7 h UTC, protégé par `CRON_SECRET` : relances réservées en base avant envoi (un cron déclenché
  deux fois n'envoie qu'une fois), puis purges. En local :
  `curl -H "Authorization: Bearer $CRON_SECRET" localhost:8787/api/v1/cron/daily`.

## Image Docker

`apps/api/Dockerfile` (contexte : racine du dépôt) produit un serveur Node : `pnpm build` regroupe
l'API et ses dépendances dans `dist/main.js` (esbuild), sans `node_modules` dans l'image finale.
Au démarrage, `dist/main.js` valide les variables, applique les migrations puis écoute sur `PORT`
(3000). L'image déclare `APP_ENV=production` : envoi d'email et S3 exigés.

`ci/verify-image.sh <image>` démarre l'image face à un Postgres vide et vérifie santé, migrations,
refus de démarrer sans configuration de mail et arrêt propre.

Pile complète : [deploy/compose.yaml](../../deploy/compose.yaml). Mise en place, sauvegardes et
retour à une version : [deploy/README.md](../../deploy/README.md).

## Historique

L'API a tourné en fonction Node sur Vercel, avec une base Neon, jusqu'au 14 novembre 2026. La
procédure de cette bascule-là reste dans [docs/bascule.md](../../docs/bascule.md).
