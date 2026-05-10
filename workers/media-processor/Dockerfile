FROM node:20-slim AS runner
WORKDIR /app

COPY . .
RUN npm install -g pnpm
RUN pnpm install --filter @catagce/media-processor...
RUN pnpm --filter @catagce/media-processor build

CMD ["node", "workers/media-processor/dist/main.js"]
