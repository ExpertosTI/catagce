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
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
COPY --from=builder /app/apps/buyer-web/.next/standalone ./
COPY --from=builder /app/apps/buyer-web/.next/static ./apps/buyer-web/.next/static
COPY --from=builder /app/apps/buyer-web/public ./apps/buyer-web/public
EXPOSE 3000
CMD ["node", "apps/buyer-web/server.js"]
