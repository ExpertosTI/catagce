FROM node:20-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm
COPY . .
RUN pnpm install
RUN pnpm --filter @catagce/db build
RUN pnpm --filter @catagce/api build

FROM node:20-alpine AS runner
WORKDIR /app
RUN npm install -g pnpm
COPY --from=builder /app/apps/api/package.json ./apps/api/
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
EXPOSE 3000
CMD ["node", "apps/api/dist/main"]
