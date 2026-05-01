import type { FetchedJob } from "./types";

// Lever Postings API (public, no auth).
// Docs: https://github.com/lever/postings-api
//
// GET https://api.lever.co/v0/postings/{site}?mode=json

type LeverPosting = {
  id: string;
  text: string;
  hostedUrl: string;
  applyUrl?: string;
  categories?: {
    location?: string;
    department?: string;
    team?: string;
    commitment?: string;
    allLocations?: string[];
  };
  workplaceType?: "onsite" | "remote" | "hybrid" | string;
  createdAt?: number; // ms epoch
  descriptionPlain?: string;
};

export async function fetchLeverJobs(slug: string): Promise<FetchedJob[]> {
  const url = `https://api.lever.co/v0/postings/${encodeURIComponent(
    slug,
  )}?mode=json`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    throw new Error(`Lever fetch failed for "${slug}": ${res.status}`);
  }
  const data = (await res.json()) as LeverPosting[];

  return data.map((p): FetchedJob => {
    const loc = p.categories?.location ?? null;
    const remote =
      p.workplaceType === "remote" ||
      (loc !== null && /\bremote\b/i.test(loc));
    return {
      externalId: p.id,
      title: p.text,
      location: loc,
      department: p.categories?.department ?? p.categories?.team ?? null,
      employmentType: p.categories?.commitment ?? null,
      remote,
      url: p.hostedUrl,
      description: truncate(p.descriptionPlain, 800),
      postedAt: p.createdAt ? new Date(p.createdAt) : null,
    };
  });
}

function truncate(s: string | undefined, max: number): string | null {
  if (!s) return null;
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > max ? t.slice(0, max) + "…" : t;
}
