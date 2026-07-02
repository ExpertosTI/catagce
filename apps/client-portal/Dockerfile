FROM node:20-alpine AS builder
WORKDIR /app
ARG NEXT_PUBLIC_API_URL=https://api.generalhome.tech/api
ARG NEXT_PUBLIC_SITE_URL=https://generalhome.tech
ARG NEXT_PUBLIC_ADMIN_URL=https://admin.generalhome.tech
ARG NEXT_PUBLIC_COMPANY_SLUG=generalhome
ARG NEXT_PUBLIC_FIREBASE_API_KEY=
ARG NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID=
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL}
ENV NEXT_PUBLIC_ADMIN_URL=${NEXT_PUBLIC_ADMIN_URL}
ENV NEXT_PUBLIC_COMPANY_SLUG=${NEXT_PUBLIC_COMPANY_SLUG}
ENV NEXT_PUBLIC_FIREBASE_API_KEY=${NEXT_PUBLIC_FIREBASE_API_KEY}
ENV NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=${NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN}
ENV NEXT_PUBLIC_FIREBASE_PROJECT_ID=${NEXT_PUBLIC_FIREBASE_PROJECT_ID}
RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/client-portal/package.json ./apps/client-portal/
RUN pnpm install --filter @ghome/client-portal... --frozen-lockfile
COPY apps/client-portal ./apps/client-portal
RUN pnpm --filter @ghome/client-portal build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
COPY --from=builder /app/apps/client-portal/.next/standalone ./
COPY --from=builder /app/apps/client-portal/.next/static ./apps/client-portal/.next/static
COPY --from=builder /app/apps/client-portal/public ./apps/client-portal/public
EXPOSE 3000
CMD ["node", "apps/client-portal/server.js"]
