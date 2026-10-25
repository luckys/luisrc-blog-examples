ARG NODE_IMAGE=node:24.19.0-bookworm-slim@sha256:a9f5f7c91a432850b2a8a7797adf5eadb6c733ceed61167806cee7ea7fbc29df
FROM ${NODE_IMAGE} AS build
WORKDIR /workspace
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/container-environments/package.json packages/container-environments/package.json
RUN pnpm install --frozen-lockfile --ignore-scripts --filter @luisrc-examples/container-environments
COPY packages/container-environments/tsconfig.json packages/container-environments/tsconfig.json
COPY packages/container-environments/src packages/container-environments/src
RUN pnpm --filter @luisrc-examples/container-environments build \
    && pnpm --filter @luisrc-examples/container-environments deploy --prod /output

FROM ${NODE_IMAGE} AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build --chown=node:node /output ./
USER node
EXPOSE 3000
CMD ["node", "dist/server.js"]
