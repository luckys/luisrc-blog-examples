FROM node:24.19.0-bookworm-slim@sha256:a9f5f7c91a432850b2a8a7797adf5eadb6c733ceed61167806cee7ea7fbc29df
WORKDIR /app
ARG APP_VERSION=v1
RUN printf '%s\n' "$APP_VERSION" > version.txt
COPY --chown=node:node app/server.mjs ./server.mjs
USER node
EXPOSE 3000
CMD ["node", "server.mjs"]
