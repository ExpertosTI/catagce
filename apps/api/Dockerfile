FROM node:20-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm
COPY . .
RUN pnpm install
RUN pnpm --filter @catagce/db build
RUN pnpm --filter @catagce/api build && test -f apps/api/dist/main.js
RUN pnpm --filter @catagce/api --prod deploy /prod --legacy

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /prod/ ./
# pnpm deploy omite dist/ (está en .gitignore) — overlay sin tocar deps de @catagce/db
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/packages/db/dist ./node_modules/@catagce/db/dist
RUN test -f dist/main.js && node -e "require('@catagce/db'); console.log('api image ok')"
EXPOSE 3000
CMD ["node", "dist/main.js"]
