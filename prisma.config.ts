import { defineConfig } from "prisma/config";

// During `prisma generate` on Vercel, DATABASE_URL may be unset.
// Prefer process.env so generate does not throw while loading this file.
const databaseUrl =
  process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:5432/postgres?schema=public";

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
