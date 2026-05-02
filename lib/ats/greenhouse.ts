import type { FetchedJob } from "./types";

// Greenhouse Job Board API (public, no auth).
// Docs: https://developers.greenhouse.io/job-board.html
//
// GET https://boards-api.greenhouse.io/v1/boards/{board_token}/jobs?content=true

type GreenhouseJob = {
  id: number;
  title: string;
  absolute_url: string;
  location?: { name?: string };
  departments?: { id: number; name: string }[];
  metadata?: { name: string; value: unknown }[];
  updated_at?: string;
  content?: string; // HTML, when ?content=true
};

type GreenhouseResponse = {
  jobs: GreenhouseJob[];
  meta?: { total: number };
};

export async function fetchGreenhouseJobs(slug: string): Promise<FetchedJob[]> {
  const url = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(
    slug,
  )}/jobs?content=true`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip, deflate",
    },
    cache: "no-store",
    signal: AbortSignal.timeout(45_000),
  });
  if (!res.ok) {
    throw new Error(`Greenhouse fetch failed for "${slug}": ${res.status}`);
  }
  const data = (await res.json()) as GreenhouseResponse;

  return data.jobs.map((j): FetchedJob => {
    const locationName = j.location?.name?.trim() || null;
    return {
      externalId: String(j.id),
      title: j.title,
      location: locationName,
      department: j.departments?.[0]?.name ?? null,
      employmentType: null,
      remote: isRemoteText(locationName ?? ""),
      url: j.absolute_url,
      description: stripHtmlSummary(j.content),
      postedAt: j.updated_at ? new Date(j.updated_at) : null,
    };
  });
}

function isRemoteText(s: string): boolean {
  return /\bremote\b/i.test(s);
}

function stripHtmlSummary(html: string | undefined, max = 800): string | null {
  if (!html) return null;
  // Greenhouse content is HTML-encoded twice in some boards; decode entities lightly.
  const decoded = html
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"');
  const text = decoded
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? text.slice(0, max) + "…" : text;
}
