# syntax=docker/dockerfile:1.7
ARG NODE_VERSION=lts-alpine
ARG NGINX_VERSION=alpine
ARG SITE_DIR=packages/site-template
ARG PNPM_INSTALL_FLAGS=--frozen-lockfile

FROM node:${NODE_VERSION} AS build
ARG SITE_DIR
ARG PNPM_INSTALL_FLAGS
WORKDIR /repo/${SITE_DIR}

RUN corepack enable

# Install deps with cache-friendly layering. This template package consumes
# monorepo contracts, so build with the repository root as Docker context.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml /repo/
COPY packages/contracts /repo/packages/contracts
COPY ${SITE_DIR}/package.json ${SITE_DIR}/pnpm-lock.yaml ./
RUN pnpm install ${PNPM_INSTALL_FLAGS}

# Build
COPY ${SITE_DIR} .
ARG SITE_URL=https://example.com
ENV SITE_URL=${SITE_URL}
RUN pnpm check:responsive && pnpm build

FROM nginx:${NGINX_VERSION}
ARG SITE_DIR
RUN rm -f /etc/nginx/conf.d/default.conf
COPY ${SITE_DIR}/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/${SITE_DIR}/dist /usr/share/nginx/html

# Healthcheck via curl-less wget bundled with alpine nginx images
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1

EXPOSE 80
