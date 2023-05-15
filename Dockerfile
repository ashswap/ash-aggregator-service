FROM node:16-alpine As development
ARG ENV=testnet
WORKDIR /usr/src/app

COPY --chown=node:node package*.json ./

# Set the GITLAB_TOKEN environment variable
ARG GITLAB_TOKEN
ENV GITLAB_TOKEN=$GITLAB_TOKEN

# Install private npm package
RUN echo "@trancport:registry=https://gitlab.com/api/v4/projects/44133673/packages/npm/" > .npmrc && \
    echo "//gitlab.com/api/v4/projects/44133673/packages/npm/:_authToken="${GITLAB_TOKEN}"" >> .npmrc

RUN npm ci --only=development

COPY --chown=node:node . .
COPY --chown=node:node /pool_config/pool.${ENV}.yaml ./pool_config/pool.yaml

RUN npm run build
USER node
FROM node:16-alpine as production
ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}


WORKDIR /usr/src/app

COPY --chown=node:node package*.json ./
# Set the GITLAB_TOKEN environment variable
ARG GITLAB_TOKEN
ENV GITLAB_TOKEN=$GITLAB_TOKEN

# Install private npm package
RUN echo "@trancport:registry=https://gitlab.com/api/v4/projects/44133673/packages/npm/" > .npmrc && \
    echo "//gitlab.com/api/v4/projects/44133673/packages/npm/:_authToken="${GITLAB_TOKEN}"" >> .npmrc
RUN npm ci --only=production && npm cache clean --force

COPY --chown=node:node . .

COPY --chown=node:node --from=development /usr/src/app/dist ./dist
USER node

CMD ["node", "dist/src/main"]
