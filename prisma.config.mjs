import { defineConfig } from "prisma/config";

// Plain JS config so Vercel does not need a TypeScript loader.
// Fallback keeps `prisma generate` working before DATABASE_URL is set.
const databaseUrl =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@127.0.0.1:5432/postgres?schema=public";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: databaseUrl,
  },
});
