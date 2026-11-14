# Image de l'API (serveur Node). Contexte de build : la racine du dépôt.
#   docker build -f apps/api/Dockerfile -t candidash-api .
FROM node:26-slim AS build
WORKDIR /repo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
# Même pnpm que le champ `packageManager` (corepack n'est plus livré avec Node).
RUN npm install --global "$(node -p "require('./package.json').packageManager")" \
 && pnpm install --frozen-lockfile --filter api
COPY apps/api apps/api
RUN pnpm --filter api build

FROM node:26-alpine
# APP_ENV=production : SMTP et S3 exigés au démarrage (src/node-env.ts).
ENV NODE_ENV=production APP_ENV=production PORT=3000
WORKDIR /app
# Le bundle esbuild embarque ses dépendances : ni node_modules ni pnpm dans l'image finale.
COPY --from=build /repo/apps/api/dist/main.js /repo/apps/api/dist/package.json dist/
COPY apps/api/drizzle drizzle/
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:' + process.env.PORT + '/api/v1/health').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"]
CMD ["node", "dist/main.js"]
