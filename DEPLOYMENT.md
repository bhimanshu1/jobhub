# Deploying JobHub to Production

This walks you through getting JobHub running on a real domain in about
30 minutes. Total cost: $0/month plus a domain (~$10/year).

## What you'll set up

| Service | Role | Cost |
|---|---|---|
| **Neon** | Postgres database | Free tier (0.5 GB) |
| **Vercel** | Hosting + cron + edge | Free Hobby plan |
| **Cerebras** | LLM API (already configured locally) | Free tier |
| Domain registrar | Custom URL | ~$10/year |

---

## Step 1 — Switch the database from SQLite to Postgres

Local SQLite works fine for dev, but Vercel's serverless filesystem is
ephemeral. Production needs a real Postgres.

**1.1 Create a Neon database.**

- Go to <https://console.neon.tech/> and sign up (Google sign-in is fastest).
- Create a project named `jobhub`. The default region is fine.
- Copy the **"pooled" connection string** from the Connection Details card.
  It looks like: `postgresql://user:pass@ep-xxx-pooler.region.aws.neon.tech/jobhub?sslmode=require`

**1.2 Update the local schema.**

Open `prisma/schema.prisma` and change the datasource block:

```prisma
datasource db {
  provider = "postgresql"
}
```

**1.3 Update the local Prisma client adapter.**

Install the Postgres adapter:

```bash
npm install @prisma/adapter-pg pg
npm install --save-dev @types/pg
npm uninstall @prisma/adapter-better-sqlite3 better-sqlite3
```

Edit `lib/db.ts` to use the Postgres adapter:

```ts
import { PrismaClient } from "./generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

function makeClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required");
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

export const prisma: PrismaClient =
  globalThis.__prisma ?? (globalThis.__prisma = makeClient());
```

**1.4 Reset migrations and re-create against Postgres.**

The existing migration files target SQLite syntax and won't apply to
Postgres. Delete them and create a fresh init:

```bash
rm -rf prisma/migrations
echo "DATABASE_URL=<your-neon-connection-string>" >> .env.local
npx prisma migrate dev --name init
```

This creates a new `prisma/migrations/<timestamp>_init/` directory with
Postgres-compatible SQL, applies it to Neon, and regenerates the client.

**1.5 Verify locally.**

```bash
npm run dev
```

Hit <http://localhost:3000>, sign up, add a company, search. Same as before
— now backed by Postgres.

---

## Step 2 — Push to GitHub

Vercel deploys directly from a Git repo.

```bash
git init
git add .
git commit -m "Initial deployable JobHub"
# Create a new private repo on GitHub, then:
git remote add origin git@github.com:yourname/jobhub.git
git branch -M main
git push -u origin main
```

`.env.local` is gitignored — your Cerebras key and DATABASE_URL stay local.
You'll re-enter them on Vercel in the next step.

---

## Step 3 — Deploy to Vercel

**3.1** Go to <https://vercel.com/new>, sign in with GitHub, and import your
`jobhub` repo.

**3.2 Set environment variables.** On the import screen, expand
**Environment Variables** and add:

| Name | Value |
|---|---|
| `DATABASE_URL` | Your Neon **pooled** connection string |
| `AUTH_SECRET` | Any random 32+ char string. Generate one with `openssl rand -base64 32`. |
| `CRON_SECRET` | Another random string. Used by Vercel Cron to authenticate the sync job. |
| `OPENAI_API_KEY` | Your Cerebras `csk-…` key |
| `OPENAI_BASE_URL` | `https://api.cerebras.ai/v1` |
| `OPENAI_MODEL` | `llama3.1-8b` (or any model you tested) |

**3.3** Click **Deploy**. The build runs `prisma generate && prisma migrate deploy && next build`.
First build takes ~2 minutes.

**3.4** Visit your deployment URL. You should see the public landing page.
Sign up, add a company, confirm everything works.

---

## Step 4 — Verify the cron job

Vercel Cron is configured in `vercel.json` to call `/api/cron/sync` daily at
06:00 UTC. To test it manually:

```bash
curl -H "Authorization: Bearer <your-CRON_SECRET>" \
  https://your-app.vercel.app/api/cron/sync
```

Should return JSON with sync stats. If you see `Unauthorized`, double-check
`CRON_SECRET` matches the env var in Vercel.

---

## Step 5 — Custom domain (optional)

In Vercel project settings → **Domains** → add yours. Vercel walks you
through DNS records at the registrar. SSL is automatic.

---

## Operational notes

**Database backups.** Neon's free tier includes 7 days of point-in-time
recovery. Sufficient for early-stage. Upgrade to a paid plan ($19/mo) when
you have real users.

**Monitoring.** Vercel's dashboard shows logs, errors, and runtime metrics
out of the box. For more detailed error reporting, integrate Sentry — their
free tier covers a small product easily.

**Rate limits we already enforce.**

- 5 failed logins per username triggers a 15-minute lockout.
- Sessions expire after 30 days, sliding-renewed when activity is recent.

**Things still to add before charging users.**

- Email verification + password reset (need a transactional email service —
  Resend free tier works).
- Self-serve account deletion (currently the privacy policy promises it via
  email; build a button).
- Stripe integration for the Pro tier.
- Replace the placeholder Privacy Policy and Terms with versions reviewed by
  a lawyer for your jurisdiction.

---

## Cost watch-out

The Cerebras free tier has a per-minute RPM cap. For a single user that
won't matter, but if you publicly launch and 100 people are searching at
once, expect 429s. Premium plan costs ~$10/month with much higher limits;
worth budgeting once paid users come online.
