FROM node:22-alpine AS base
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json tsconfig.base.json ./
COPY api-server/package.json api-server/package.json
COPY shared/db/package.json shared/db/package.json
COPY shared/api-zod/package.json shared/api-zod/package.json

RUN corepack enable && pnpm install --frozen-lockfile

COPY . .
RUN pnpm --filter @workspace/api-server build

EXPOSE 3000
CMD ["pnpm", "--filter", "@workspace/api-server", "start"]
