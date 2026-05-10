FROM node:20-slim AS runner
WORKDIR /app

COPY . .
RUN npm install -g pnpm
RUN pnpm install --filter @catagce/notifications...
RUN pnpm --filter @catagce/notifications build

CMD ["node", "workers/notifications/dist/index.js"]
