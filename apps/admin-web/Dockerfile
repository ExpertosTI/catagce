FROM node:20-alpine AS builder
WORKDIR /app
ARG NEXT_PUBLIC_API_URL=https://api.generalhome.tech/api
ARG NEXT_PUBLIC_SITE_URL=https://generalhome.tech
ARG NEXT_PUBLIC_ADMIN_URL=https://admin.generalhome.tech
ARG NEXT_PUBLIC_COMPANY_SLUG=generalhome
ARG NEXT_PUBLIC_APP_NAME=GHome Admin
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}
ENV NEXT_PUBLIC_ADMIN_URL=${NEXT_PUBLIC_ADMIN_URL}
ENV NEXT_PUBLIC_COMPANY_SLUG=${NEXT_PUBLIC_COMPANY_SLUG}
ENV NEXT_PUBLIC_APP_NAME=${NEXT_PUBLIC_APP_NAME}
RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/admin-web/package.json ./apps/admin-web/
RUN pnpm install --filter @ghome/admin-web... --frozen-lockfile
COPY apps/admin-web ./apps/admin-web
RUN pnpm --filter @ghome/admin-web build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
COPY --from=builder /app/apps/admin-web/.next/standalone ./
COPY --from=builder /app/apps/admin-web/.next/static ./apps/admin-web/.next/static
COPY --from=builder /app/apps/admin-web/public ./apps/admin-web/public
EXPOSE 3000
CMD ["node", "apps/admin-web/server.js"]
