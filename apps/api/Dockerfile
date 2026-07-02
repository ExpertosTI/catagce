FROM node:20-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm
COPY . .
RUN pnpm install
RUN pnpm --filter @ghome/db build
RUN pnpm --filter @ghome/api build && test -f apps/api/dist/main.js
RUN pnpm --filter @ghome/api --prod deploy /prod --legacy

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /prod/ ./
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/packages/db/dist ./node_modules/@ghome/db/dist
COPY apps/api/docker-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh && test -f dist/main.js && node -e "require('@ghome/db'); console.log('ghome api image ok')"
EXPOSE 3000
ENTRYPOINT ["/entrypoint.sh"]
CMD ["node", "dist/main.js"]
