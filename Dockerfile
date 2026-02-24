# ---- Étape de build ----
# Utilise Node.js 20 avec Alpine comme image de base pour le build
FROM node:20-alpine AS build

# Définit le répertoire de travail dans le conteneur
WORKDIR /app

# Installer pnpm globalement
RUN npm install -g pnpm

# Copie les fichiers package.json et pnpm-lock.yaml
COPY package*.json pnpm-lock.yaml* ./

# Installe les dépendances
RUN pnpm install --frozen-lockfile

# Copie tout le code source
COPY . .

# Build l'application Angular en mode production
RUN pnpm run build --configuration production

# ---- Étape de production ----
# Utilise Nginx Alpine comme image finale légère
FROM nginx:alpine

# Copie les fichiers buildés depuis l'étape de build
COPY --from=build /app/dist/ng-candidash-app/browser/ /usr/share/nginx/html/

# Configuration Nginx optimisée (gzip + cache + security headers)
RUN printf 'server {\n\
    listen 80;\n\
    server_name localhost;\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
\n\
    location / {\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
\n\
    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {\n\
        expires 1y;\n\
        add_header Cache-Control "public, immutable";\n\
    }\n\
\n\
    gzip on;\n\
    gzip_vary on;\n\
    gzip_proxied any;\n\
    gzip_comp_level 6;\n\
    gzip_min_length 256;\n\
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml image/svg+xml application/wasm;\n\
}\n' > /etc/nginx/conf.d/default.conf

# Script d'entrypoint pour injecter API_URL au runtime
RUN printf '#!/bin/sh\n\
API_URL="${API_URL:-http://localhost:3000/api/v1}"\n\
echo "{\"apiUrl\":\"${API_URL}\"}" > /usr/share/nginx/html/config.json\n\
exec nginx -g "daemon off;"\n' > /docker-entrypoint-custom.sh && chmod +x /docker-entrypoint-custom.sh

EXPOSE 80
CMD ["/docker-entrypoint-custom.sh"]
