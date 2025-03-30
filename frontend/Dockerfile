# Build-Stage
FROM node:20-alpine as build-stage

WORKDIR /app

# Kopiere package.json und package-lock.json
COPY frontend/package*.json ./

# Installiere Abhängigkeiten
RUN npm ci

# Kopiere den Quellcode
COPY frontend/ .

# Erstelle Produktions-Build
RUN npm run build

# Produktions-Stage
FROM nginx:stable-alpine as production-stage

# Kopiere die gebauten Dateien
COPY --from=build-stage /app/dist /usr/share/nginx/html

# Kopiere Nginx-Konfiguration
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Kopiere und konfiguriere das Entrypoint-Skript
COPY frontend/env.sh /docker-entrypoint.d/env.sh
RUN chmod +x /docker-entrypoint.d/env.sh && dos2unix /docker-entrypoint.d/env.sh

# Exponiere Port 80
EXPOSE 80

# Starte Nginx mit dem Entrypoint-Skript
CMD [ "nginx", "-g", "daemon off;"]