import { prisma } from "./db";
import { fetchJobsFor, type AtsType } from "./ats";
import { extractDomain } from "./format";

export type SyncResult = {
  added: number;
  updated: number;
  deactivated: number;
  total: number;
};

// Hostnames belonging to ATS systems — never use these as the company website.
const ATS_HOSTS = new Set<string>([
  "greenhouse.io",
  "boards.greenhouse.io",
  "boards-api.greenhouse.io",
  "job-boards.greenhouse.io",
  "lever.co",
  "jobs.lever.co",
  "ashbyhq.com",
  "jobs.ashbyhq.com",
  "api.ashbyhq.com",
  "smartrecruiters.com",
  "workable.com",
  "myworkdayjobs.com",
]);

function isAtsHost(host: string): boolean {
  if (ATS_HOSTS.has(host)) return true;
  // Also catch *.greenhouse.io / *.lever.co / *.ashbyhq.com etc.
  for (const h of ATS_HOSTS) {
    if (host.endsWith(`.${h}`)) return true;
  }
  return false;
}

/** Reduce "careers.airbnb.com" → "airbnb.com". Keeps known 2-part TLDs. */
function apexDomain(host: string): string {
  const parts = host.split(".").filter(Boolean);
  if (parts.length <= 2) return host;
  // Naive but works for .com/.ai/.io/.co/.org/.net etc.
  return parts.slice(-2).join(".");
}

/**
 * Best-effort: pick the most common non-ATS host across job apply URLs and
 * return its apex domain. Empty if all URLs point back at the ATS.
 */
function detectWebsiteFromJobs(jobUrls: string[]): string | null {
  const counts = new Map<string, number>();
  for (const url of jobUrls) {
    const host = extractDomain(url);
    if (!host) continue;
    if (isAtsHost(host)) continue;
    const apex = apexDomain(host);
    counts.set(apex, (counts.get(apex) ?? 0) + 1);
  }
  if (counts.size === 0) return null;
  let best: [string, number] = ["", 0];
  for (const entry of counts) {
    if (entry[1] > best[1]) best = entry;
  }
  return best[0] || null;
}

/**
 * Sync jobs for a single company. Strategy:
 *   - Fetch the latest list from the ATS.
 *   - Upsert each job (insert if new, update lastSeenAt + fields if known).
 *   - Mark any previously-active job that wasn't returned this round as inactive.
 */
export async function syncCompany(companyId: string): Promise<SyncResult> {
  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) throw new Error(`Company not found: ${companyId}`);

  let fetched;
  try {
    fetched = await fetchJobsFor(company.atsType as AtsType, company.atsSlug);
  } catch (err) {
    await prisma.company.update({
      where: { id: companyId },
      data: {
        lastSyncedAt: new Date(),
        lastSyncError: err instanceof Error ? err.message : String(err),
      },
    });
    throw err;
  }

  const now = new Date();
  const seenExternalIds = new Set<string>();

  let added = 0;
  let updated = 0;

  for (const job of fetched) {
    seenExternalIds.add(job.externalId);
    const result = await prisma.job.upsert({
      where: {
        companyId_externalId: {
          companyId: company.id,
          externalId: job.externalId,
        },
      },
      create: {
        companyId: company.id,
        externalId: job.externalId,
        title: job.title,
        location: job.location,
        department: job.department,
        employmentType: job.employmentType,
        remote: job.remote,
        url: job.url,
        description: job.description,
        postedAt: job.postedAt,
        firstSeenAt: now,
        lastSeenAt: now,
        isActive: true,
      },
      update: {
        title: job.title,
        location: job.location,
        department: job.department,
        employmentType: job.employmentType,
        remote: job.remote,
        url: job.url,
        description: job.description,
        postedAt: job.postedAt,
        lastSeenAt: now,
        isActive: true,
      },
    });
    // Crude "added" heuristic: if firstSeenAt === lastSeenAt and is "now-ish", count as new.
    if (
      result.firstSeenAt.getTime() === result.lastSeenAt.getTime() &&
      now.getTime() - result.firstSeenAt.getTime() < 5_000
    ) {
      added++;
    } else {
      updated++;
    }
  }

  // Mark missing jobs inactive.
  const deactivateRes = await prisma.job.updateMany({
    where: {
      companyId: company.id,
      isActive: true,
      externalId: { notIn: Array.from(seenExternalIds) },
    },
    data: { isActive: false },
  });

  // Auto-detect company website from job URLs if we don't already have one.
  let websiteUrl = company.websiteUrl;
  if (!websiteUrl) {
    const detected = detectWebsiteFromJobs(fetched.map((j) => j.url));
    if (detected) websiteUrl = `https://${detected}`;
  }

  await prisma.company.update({
    where: { id: companyId },
    data: {
      lastSyncedAt: now,
      lastSyncError: null,
      ...(websiteUrl && websiteUrl !== company.websiteUrl
        ? { websiteUrl }
        : {}),
    },
  });

  return {
    added,
    updated,
    deactivated: deactivateRes.count,
    total: fetched.length,
  };
}
