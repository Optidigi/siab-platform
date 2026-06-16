# syntax=docker/dockerfile:1.7
ARG NODE_VERSION=lts-alpine
ARG SITE_DIR=sites/ami-care

FROM node:${NODE_VERSION} AS build
ARG SITE_DIR
WORKDIR /repo/${SITE_DIR}

COPY ${SITE_DIR}/package.json ${SITE_DIR}/pnpm-lock.yaml ./
COPY packages/contracts /repo/packages/contracts
RUN corepack enable && pnpm install --frozen-lockfile

COPY ${SITE_DIR} .
ARG SITE_URL=https://example.com
ENV SITE_URL=${SITE_URL}
RUN pnpm check:responsive && pnpm build

FROM node:${NODE_VERSION}
ARG SITE_DIR
WORKDIR /repo/${SITE_DIR}
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4321
ENV CMS_DATA_DIR=/data

# Copy production deps + built server bundle
COPY --from=build /repo/${SITE_DIR}/package.json /repo/${SITE_DIR}/pnpm-lock.yaml ./
COPY --from=build /repo/packages/contracts /repo/packages/contracts
RUN corepack enable && pnpm install --prod --frozen-lockfile
COPY --from=build /repo/${SITE_DIR}/dist ./dist

EXPOSE 4321

HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:4321/healthz >/dev/null || exit 1

CMD ["node", "./dist/server/entry.mjs"]
