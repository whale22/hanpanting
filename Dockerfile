FROM ubuntu:24.04

ARG DEBIAN_FRONTEND=noninteractive
ARG NODE_VERSION=24.21.0

SHELL ["/bin/bash", "-o", "pipefail", "-c"]

RUN apt-get update \
    && apt-get install --yes --no-install-recommends \
        ca-certificates \
        curl \
        gnupg \
        nginx \
        supervisor \
        xz-utils \
    && curl --fail --silent --show-error --location \
        https://pgp.mongodb.com/server-8.0.asc \
        | gpg --dearmor --output /usr/share/keyrings/mongodb-server-8.0.gpg \
    && echo "deb [arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-8.0.gpg] https://repo.mongodb.org/apt/ubuntu noble/mongodb-org/8.0 multiverse" \
        > /etc/apt/sources.list.d/mongodb-org-8.0.list \
    && apt-get update \
    && apt-get install --yes --no-install-recommends \
        mongodb-mongosh \
        mongodb-org-server \
    && rm -rf /var/lib/apt/lists/*

RUN machine_architecture="$(dpkg --print-architecture)" \
    && case "${machine_architecture}" in \
        amd64) node_architecture="x64" ;; \
        arm64) node_architecture="arm64" ;; \
        *) echo "지원하지 않는 CPU 아키텍처입니다: ${machine_architecture}" >&2; exit 1 ;; \
       esac \
    && node_archive="node-v${NODE_VERSION}-linux-${node_architecture}.tar.xz" \
    && curl --fail --silent --show-error --location --remote-name \
        "https://nodejs.org/dist/v${NODE_VERSION}/${node_archive}" \
    && curl --fail --silent --show-error --location --remote-name \
        "https://nodejs.org/dist/v${NODE_VERSION}/SHASUMS256.txt" \
    && grep " ${node_archive}$" SHASUMS256.txt | sha256sum --check --strict - \
    && tar --extract --xz --file="${node_archive}" --directory=/usr/local --strip-components=1 \
    && rm "${node_archive}" SHASUMS256.txt \
    && node --version \
    && npm --version

RUN groupadd --system hanpanting \
    && useradd --system --gid hanpanting --home-dir /app --shell /usr/sbin/nologin hanpanting

WORKDIR /app

COPY --chown=hanpanting:hanpanting . .

RUN npm ci --no-audit --no-fund \
    && npm cache clean --force

COPY docker/nginx.conf /etc/nginx/sites-available/default
COPY docker/mongod.conf /etc/mongod.conf
COPY docker/supervisord.conf /etc/supervisor/conf.d/hanpanting.conf
COPY docker/entrypoint.sh /usr/local/bin/hanpanting-entrypoint

RUN chmod 0755 /usr/local/bin/hanpanting-entrypoint \
    && mkdir -p /run/nginx /var/lib/mongodb /var/log/mongodb \
    && chown -R mongodb:mongodb /var/lib/mongodb /var/log/mongodb

ENV NODE_ENV=production \
    BETTER_AUTH_URL=http://localhost:3000 \
    MONGODB_URI=mongodb://127.0.0.1:27017/hanpanting_dev

VOLUME ["/var/lib/mongodb"]
EXPOSE 3000

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=4 \
    CMD curl --fail --silent http://127.0.0.1:3000/health > /dev/null || exit 1

ENTRYPOINT ["/usr/local/bin/hanpanting-entrypoint"]
