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

# Créer le fichier d'environnement de production pour la liaison backend
ARG API_URL
ENV API_URL=${API_URL:-http://localhost:3000}

RUN mkdir -p src/environments && \
    echo "export const environment = {" > src/environments/environment.ts && \
    echo "  production: true," >> src/environments/environment.ts && \
    echo "  apiUrl: '${API_URL}'," >> src/environments/environment.ts && \
    echo "};" >> src/environments/environment.ts

# Build l'application Angular en mode production
RUN pnpm run build --configuration production

# ---- Étape de production ----
# Utilise Nginx Alpine comme image finale légère
FROM nginx:alpine

# Copie les fichiers buildés depuis l'étape de build
COPY --from=build /app/dist/ng-candidash-app/browser/ /usr/share/nginx/html/

# Configuration Nginx basique mais efficace
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
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml image/svg+xml;\n\
}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]