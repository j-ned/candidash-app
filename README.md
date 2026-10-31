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
