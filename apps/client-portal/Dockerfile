FROM node:20-alpine AS builder
WORKDIR /app
ARG NEXT_PUBLIC_API_URL=https://api.generalhome.tech/api
ARG NEXT_PUBLIC_SITE_URL=https://generalhome.tech
ARG NEXT_PUBLIC_ADMIN_URL=https://admin.generalhome.tech
ARG NEXT_PUBLIC_COMPANY_SLUG=generalhome
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}
ENV NEXT_PUBLIC_ADMIN_URL=${NEXT_PUBLIC_ADMIN_URL}
ENV NEXT_PUBLIC_COMPANY_SLUG=${NEXT_PUBLIC_COMPANY_SLUG}
RUN npm install -g pnpm
COPY . .
RUN pnpm install
RUN pnpm --filter @ghome/db build
RUN pnpm --filter @ghome/client-portal build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
COPY --from=builder /app/apps/client-portal/.next/standalone ./
COPY --from=builder /app/apps/client-portal/.next/static ./apps/client-portal/.next/static
EXPOSE 3000
CMD ["node", "apps/client-portal/server.js"]
