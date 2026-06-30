FROM node:20-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm
COPY . .
RUN pnpm install
RUN pnpm --filter @catagce/db build
RUN pnpm --filter @catagce/api build && test -f apps/api/dist/main.js
# Solo deps de producción del API (~50MB), no todo el monorepo node_modules
RUN pnpm --filter @catagce/api --prod deploy /prod --legacy

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /prod/ ./
EXPOSE 3000
CMD ["node", "dist/main.js"]
