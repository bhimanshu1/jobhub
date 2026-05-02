import { config as dotenvConfig } from "dotenv";
import { defineConfig } from "prisma/config";

// Load env files for local dev. Files that don't exist are silently
// ignored. dotenv never overrides already-set process.env values, so on
// Vercel / CI / production the platform's env vars take precedence.
dotenvConfig({ path: ".env.local" });
dotenvConfig({ path: ".env" });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  // Surface a clearer error than Prisma's generic "datasource.url required"
  // when the env var is missing at build time.
  throw new Error(
    "DATABASE_URL is not set. Locally: add it to .env.local. " +
      "On Vercel: add it under Settings → Environment Variables for the " +
      "Production environment.",
  );
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: databaseUrl,
  },
});
