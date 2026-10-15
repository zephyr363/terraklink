FROM node:24-alpine AS build
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend ./
RUN npm run build
FROM nginx:1.28-alpine
COPY infra/nginx.conf /etc/nginx/templates/default.conf.template
COPY --chmod=755 infra/15-upload-limits.envsh /docker-entrypoint.d/15-upload-limits.envsh
ENV NGINX_ENVSUBST_FILTER=MAX_REQUEST_UPLOAD_MB
COPY --from=build /app/dist /usr/share/nginx/html
