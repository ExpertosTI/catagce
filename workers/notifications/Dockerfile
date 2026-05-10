FROM node:20-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm
COPY . .
RUN pnpm install
RUN pnpm --filter @catagce/notifications build

FROM node:20-alpine AS runner
WORKDIR /app
RUN npm install -g pnpm
COPY --from=builder /app/workers/notifications/package.json ./workers/notifications/
COPY --from=builder /app/workers/notifications/dist ./workers/notifications/dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
ENV NODE_ENV=production
CMD ["node", "workers/notifications/dist/main.js"]
