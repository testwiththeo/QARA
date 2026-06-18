FROM node:22-alpine AS builder

WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ .
RUN npm run build

FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY infra/docker/nginx.conf /etc/nginx/conf.d/default.conf

HEALTHCHECK --interval=15s --timeout=3s --retries=3 \
    CMD wget -qO- http://localhost:80/health || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
