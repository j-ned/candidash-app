# Image du front (nginx, fichiers statiques). Contexte de build : la racine du dépôt.
#   docker build -f apps/web/Dockerfile -t candidash-web .
# Variables du conteneur : API_UPSTREAM (obligatoire), API_URL, EXTENSION_ID, FIREFOX_ADDON_URL.
FROM node:26-slim AS build
WORKDIR /repo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
# Même pnpm que le champ `packageManager` (corepack n'est plus livré avec Node).
RUN npm install --global "$(node -p "require('./package.json').packageManager")" \
 && pnpm install --frozen-lockfile --filter web
COPY apps/web apps/web
# Sans API_URL, le build garde le config.json versionné : celui de l'image est écrit au démarrage.
RUN pnpm --filter web build

FROM nginxinc/nginx-unprivileged:stable-alpine
COPY apps/web/nginx/security-headers.conf.template /etc/nginx/candidash/security-headers.conf.template
COPY --chmod=0555 apps/web/nginx/40-candidash-config.sh /docker-entrypoint.d/40-candidash-config.sh
COPY apps/web/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/web/dist/ng-candidash-app/browser /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD ["wget", "-q", "-O", "/dev/null", "http://127.0.0.1:8080/config.json"]
