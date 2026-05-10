FROM node:20-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm
COPY . .
RUN pnpm install
RUN pnpm --filter @catagce/ui build
RUN pnpm --filter @catagce/db build
RUN pnpm --filter @catagce/buyer-web build

FROM node:20-alpine AS runner
WORKDIR /app
RUN npm install -g pnpm
COPY --from=builder /app/apps/buyer-web/package.json ./apps/buyer-web/
COPY --from=builder /app/apps/buyer-web/public ./apps/buyer-web/public
COPY --from=builder /app/apps/buyer-web/.next ./apps/buyer-web/.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
EXPOSE 3000
CMD ["npx", "next", "start", "apps/buyer-web"]
