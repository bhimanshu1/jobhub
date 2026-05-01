import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { syncCompany } from "@/lib/sync";

/**
 * Nightly job sync. Authenticated by a shared secret in the
 * `Authorization: Bearer <CRON_SECRET>` header.
 *
 * Vercel Cron automatically sends this header when CRON_SECRET is set
 * as a project env var, so the same handler covers manual + scheduled
 * invocations.
 *
 * Configured to run daily in `vercel.json`.
 */
export async function GET(request: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return Response.json(
      { ok: false, error: "CRON_SECRET not configured." },
      { status: 500 },
    );
  }
  const auth = request.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${expected}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const start = Date.now();
  const companies = await prisma.company.findMany({
    select: { id: true, name: true },
  });

  let totalAdded = 0;
  let totalDeactivated = 0;
  let failures = 0;
  const errors: { id: string; name: string; error: string }[] = [];

  // Sequential to be polite to ATS endpoints. Could fan out with a
  // small concurrency limit later if it gets slow.
  for (const c of companies) {
    try {
      const r = await syncCompany(c.id);
      totalAdded += r.added;
      totalDeactivated += r.deactivated;
    } catch (e) {
      failures++;
      errors.push({
        id: c.id,
        name: c.name,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return Response.json({
    ok: true,
    durationMs: Date.now() - start,
    syncedCompanies: companies.length - failures,
    failures,
    totalAdded,
    totalDeactivated,
    errors: errors.slice(0, 20), // cap response size
  });
}

// Allow Vercel up to 60s to crunch through all companies.
export const maxDuration = 60;
