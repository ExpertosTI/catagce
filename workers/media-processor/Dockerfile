FROM node:20-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm
COPY . .
RUN pnpm install
RUN pnpm --filter @catagce/media-processor build

FROM node:20-alpine AS runner
WORKDIR /app
RUN npm install -g pnpm
COPY --from=builder /app/workers/media-processor/package.json ./workers/media-processor/
COPY --from=builder /app/workers/media-processor/dist ./workers/media-processor/dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages

ENV NODE_ENV=production
CMD ["node", "workers/media-processor/dist/main.js"]
