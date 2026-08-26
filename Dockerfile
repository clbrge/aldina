FROM docker.io/library/node:25-trixie AS modules

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get -qq update && apt-get -qq upgrade -y

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY package.json package-lock.json ./

RUN chown node:node -R /usr/src/app

USER node

RUN npm --omit=dev --no-audit ci --maxsockets 10

FROM docker.io/library/node:25-trixie-slim

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get -qq update && apt-get -qq upgrade -y && \
    apt-get -qq install -y --no-install-recommends chromium fonts-liberation && \
    apt-get -qq clean && rm -rf /var/lib/apt/lists/* /usr/share/doc/* /usr/share/man/* /usr/share/info/*

RUN which chromium || (echo "chromium not found" && false)

WORKDIR /srv/cs-aldina

COPY --from=modules --chown=root:root /usr/src/app/node_modules ./node_modules
COPY ./package-lock.json .
COPY ./package.json .
COPY ./src ./src
COPY ./themes ./themes

ENV NODE_ENV=production
ENV CHROMIUM=/usr/bin/chromium

ARG VERSION
ENV VERSION=${VERSION}

RUN mkdir -p /tmp/cs-ipc && chown node:node /tmp/cs-ipc

USER node

CMD ["node", "src/cli/index.js", "serve", "--socket", "/tmp/cs-ipc/aldina/render.sock"]
