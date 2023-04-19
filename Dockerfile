FROM node:16-alpine As development
ARG ENV=testnet
WORKDIR /usr/src/app

COPY --chown=node:node package*.json ./

RUN npm ci --only=development

COPY --chown=node:node . .
COPY --chown=node:node /config/config.${ENV}.yaml ./config/config.yaml

RUN npm run build
USER node
FROM node:16-alpine as production
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

WORKDIR /usr/src/app

COPY --chown=node:node package*.json ./

RUN npm ci --only=production && npm cache clean --force

COPY --chown=node:node . .

COPY --chown=node:node --from=development /usr/src/app/dist ./dist
USER node
CMD ["node", "dist/src/main"]
