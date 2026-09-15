FROM node:22.23.2-bookworm-slim AS node-runtime

FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update \
    && apt-get install --yes --no-install-recommends \
        ca-certificates \
        libatomic1 \
        libstdc++6 \
        nginx \
        tini \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home --shell /bin/bash appuser

COPY --from=node-runtime /usr/local/ /usr/local/

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY --chown=appuser:appuser . .
COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY docker/entrypoint.sh /usr/local/bin/hanpanting-entrypoint
COPY docker/codex /usr/local/bin/codex

RUN chmod 0755 \
        /usr/local/bin/hanpanting-entrypoint \
        /usr/local/bin/codex \
    && mkdir -p /tmp/nginx/client_temp \
        /tmp/nginx/proxy_temp \
        /tmp/nginx/fastcgi_temp \
        /tmp/nginx/uwsgi_temp \
        /tmp/nginx/scgi_temp \
    && chown -R appuser:appuser /tmp/nginx

USER appuser

EXPOSE 3000

ENTRYPOINT ["/usr/bin/tini", "--", "/usr/local/bin/hanpanting-entrypoint"]
