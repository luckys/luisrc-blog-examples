ARG NODE_IMAGE=node:24.19.0-bookworm-slim@sha256:a9f5f7c91a432850b2a8a7797adf5eadb6c733ceed61167806cee7ea7fbc29df
FROM ${NODE_IMAGE} AS build
WORKDIR /workspace
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/progressive-delivery/package.json packages/progressive-delivery/package.json
RUN pnpm install --frozen-lockfile --ignore-scripts --filter @luisrc-examples/progressive-delivery
COPY packages/progressive-delivery/tsconfig.json packages/progressive-delivery/tsconfig.json
COPY packages/progressive-delivery/src packages/progressive-delivery/src
RUN pnpm --filter @luisrc-examples/progressive-delivery build \
    && pnpm --filter @luisrc-examples/progressive-delivery deploy --prod /output

FROM ${NODE_IMAGE} AS runtime
ARG RELEASE=stable
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build --chown=node:node /output ./
COPY --chown=node:node packages/progressive-delivery/variants/${RELEASE}.json /app/release.json
USER node
CMD ["node", "dist/server.js"]
