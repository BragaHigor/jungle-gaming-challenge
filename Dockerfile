FROM node:22.19.0-bookworm-slim@sha256:4a4884e8a44826194dff92ba316264f392056cbe243dcc9fd3551e71cea02b90 AS build

WORKDIR /app

ENV CI=true HUSKY=0 VITE_ENABLE_MOCKS=true

RUN npm install --global npm@11.6.0

COPY package.json package-lock.json .npmrc ./
COPY .husky/install.mjs .husky/install.mjs

RUN --mount=type=cache,target=/root/.npm npm ci

COPY . .

RUN npm run build

FROM nginx:stable-alpine@sha256:c59d1f8b1e0e42da75be973424cd72e23f7f8adfb54e982f4d1cd0216a5a5576

COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY --from=build /app/dist /usr/share/nginx/html

USER nginx

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1:8080/deployment.json

ENTRYPOINT ["nginx", "-g", "daemon off;"]
