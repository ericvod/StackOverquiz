FROM oven/bun:1 AS deps

WORKDIR /app

COPY package.json bun.lock* ./

RUN bun install --frozen-lockfile --production

FROM oven/bun:1 AS runtime

WORKDIR /app

ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY package.json bun.lock* tsconfig.json drizzle.config.ts ./
COPY src ./src

EXPOSE 3000

USER bun

CMD ["sh", "-c", "bun run db:migrate:prod && bun run start"]
