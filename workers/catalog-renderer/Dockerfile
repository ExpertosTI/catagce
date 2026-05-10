FROM node:20-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm
COPY . .
RUN pnpm install
RUN pnpm --filter @catagce/catalog-renderer build

FROM node:20-alpine AS runner
WORKDIR /app
RUN apk add --no-cache chromium nss freetype harfbuzz ca-certificates ttf-freefont
RUN npm install -g pnpm
COPY --from=builder /app/workers/catalog-renderer/package.json ./workers/catalog-renderer/
COPY --from=builder /app/workers/catalog-renderer/dist ./workers/catalog-renderer/dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
ENV NODE_ENV=production
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
CMD ["node", "workers/catalog-renderer/dist/main.js"]
