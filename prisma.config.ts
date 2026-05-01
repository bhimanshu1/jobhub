import { config } from "dotenv";
// Match Next.js precedence: .env.local overrides .env in dev.
config({ path: [".env.local", ".env"] });
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
