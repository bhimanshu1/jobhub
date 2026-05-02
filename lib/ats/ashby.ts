import type { FetchedJob } from "./types";

// Ashby public Job Board API (no auth).
// Endpoint: https://api.ashbyhq.com/posting-api/job-board/{board}
//
// Returns: { jobs: AshbyJob[] }

type AshbyJob = {
  id: string;
  title: string;
  location?: string;
  secondaryLocations?: { location: string }[];
  department?: string;
  team?: string;
  isRemote?: boolean;
  jobUrl: string;
  applyUrl?: string;
  publishedAt?: string;
  employmentType?: string;
  descriptionPlain?: string;
  descriptionHtml?: string;
};

type AshbyResponse = {
  jobs: AshbyJob[];
};

export async function fetchAshbyJobs(slug: string): Promise<FetchedJob[]> {
  const url = `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(
    slug,
  )}?includeCompensation=false`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip, deflate",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(45_000),
  });
  if (!res.ok) {
    throw new Error(`Ashby fetch failed for "${slug}": ${res.status}`);
  }
  const data = (await res.json()) as AshbyResponse;

  return data.jobs.map((j): FetchedJob => {
    const loc = j.location ?? null;
    return {
      externalId: j.id,
      title: j.title,
      location: loc,
      department: j.department ?? j.team ?? null,
      employmentType: j.employmentType ?? null,
      remote: Boolean(j.isRemote) || (loc !== null && /\bremote\b/i.test(loc)),
      url: j.jobUrl,
      description: truncate(
        j.descriptionPlain ?? stripHtml(j.descriptionHtml),
        800,
      ),
      postedAt: j.publishedAt ? new Date(j.publishedAt) : null,
    };
  });
}

function stripHtml(html: string | undefined): string | undefined {
  if (!html) return undefined;
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(s: string | undefined, max: number): string | null {
  if (!s) return null;
  return s.length > max ? s.slice(0, max) + "…" : s;
}
