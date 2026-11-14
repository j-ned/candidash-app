# Image du front (nginx, fichiers statiques). Contexte de build : la racine du dépôt.
#   docker build -f apps/web/Dockerfile --build-arg API_URL=https://…/api/v1 -t candidash-web .
FROM node:26-slim AS build
WORKDIR /repo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
# Même pnpm que le champ `packageManager` (corepack n'est plus livré avec Node).
RUN npm install --global "$(node -p "require('./package.json').packageManager")" \
 && pnpm install --frozen-lockfile --filter web
COPY apps/web apps/web
# Valeurs publiques, écrites dans config.json au build (scripts/runtime-config.mjs).
ARG API_URL
ARG EXTENSION_ID
ARG FIREFOX_ADDON_URL
RUN test -n "$API_URL" || { echo "build-arg API_URL obligatoire" >&2; exit 1; }
RUN API_URL="$API_URL" EXTENSION_ID="$EXTENSION_ID" FIREFOX_ADDON_URL="$FIREFOX_ADDON_URL" \
    pnpm --filter web build

FROM nginxinc/nginx-unprivileged:stable-alpine
COPY apps/web/nginx/security-headers.conf /etc/nginx/snippets/security-headers.conf
COPY apps/web/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/web/dist/ng-candidash-app/browser /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD ["wget", "-q", "-O", "/dev/null", "http://127.0.0.1:8080/config.json"]
