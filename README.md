# Candidash API (Hono · Cloudflare Workers)

Remplaçant serverless de `nest-candidash-app` : même base Postgres (via Hyperdrive), mêmes
migrations Drizzle, mêmes routes `/api/v1`, même forme d'erreur.

## Développement

```bash
docker run -d --name candidash-db -p 5432:5432 \
  -e POSTGRES_USER=candidash -e POSTGRES_PASSWORD=candidash -e POSTGRES_DB=candidash postgres:17
DATABASE_URL=postgresql://candidash:candidash@localhost:5432/candidash pnpm db:migrate
pnpm test        # intégration sous Node, app.request() contre ce Postgres
pnpm dev         # runtime Workers local (workerd), Hyperdrive → localConnectionString
```

Variables locales dans `.dev.vars` (ignoré par git) : `ENVIRONMENT=development` (codes de
vérification affichés dans la console tant que le SMTP n'est pas branché), `JWT_SECRET`,
`TOTP_ENCRYPTION_KEY` (64 caractères hex).

## Emails et tâches planifiées

- SMTP depuis le Worker en **TLS implicite uniquement (port 465)** : worker-mailer repasse en
  clair si un serveur 587 n'annonce pas STARTTLS, donc tout autre port est refusé. Secrets :
  `MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_PASSWORD`, `MAIL_FROM_ADDRESS`.
- Cron Triggers : relances toutes les heures (`0 * * * *`), purges à 2 h UTC (`0 2 * * *`).
  En local : `wrangler dev --test-scheduled` puis `curl "localhost:8787/__scheduled?cron=0+*+*+*+*"`.
