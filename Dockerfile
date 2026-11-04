FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
ENV AUTH_SECRET=build-time-placeholder
ENV DATABASE_URL=postgresql://karm:karm@127.0.0.1:5432/karmkaro?schema=public
RUN npx prisma generate && npx next build

ENV NODE_ENV=production
ENV PORT=43123
EXPOSE 43123

COPY scripts/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:43123/api/health').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["/docker-entrypoint.sh"]
