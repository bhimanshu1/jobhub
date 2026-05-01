import type { AtsType, DetectedSource } from "./types";

/**
 * Detect the ATS (Applicant Tracking System) used by a career-page URL.
 *
 * Strategy:
 *   1. Match the URL against direct ATS patterns (boards.greenhouse.io,
 *      jobs.lever.co, jobs.ashbyhq.com).
 *   2. If no direct match, fetch the page HTML and look for embedded
 *      ATS markers (script src, iframe src, links).
 *
 * Throws if the source can't be determined.
 */
export async function detectAtsFromUrl(
  rawUrl: string,
): Promise<DetectedSource> {
  const url = normalizeUrl(rawUrl);

  // 1. Direct ATS URL patterns.
  const direct = matchDirectAts(url);
  if (direct) return direct;

  // 2. Fetch page and look for embedded markers.
  const embedded = await detectFromPage(url);
  if (embedded) return embedded;

  throw new Error(
    `Could not detect ATS for ${url}. ` +
      `Supported: Greenhouse, Lever, Ashby. ` +
      `Try pasting the direct ATS URL (e.g. boards.greenhouse.io/<company>).`,
  );
}

function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!/^https?:\/\//i.test(trimmed)) return `https://${trimmed}`;
  return trimmed;
}

function matchDirectAts(url: string): DetectedSource | null {
  const u = new URL(url);
  const host = u.hostname.toLowerCase();
  const segments = u.pathname.split("/").filter(Boolean);

  // Greenhouse: boards.greenhouse.io/<slug> or job-boards.greenhouse.io/<slug>
  if (
    (host === "boards.greenhouse.io" || host === "job-boards.greenhouse.io") &&
    segments[0]
  ) {
    return makeSource("greenhouse", segments[0], url);
  }

  // Lever: jobs.lever.co/<slug>
  if (host === "jobs.lever.co" && segments[0]) {
    return makeSource("lever", segments[0], url);
  }

  // Ashby: jobs.ashbyhq.com/<slug>
  if (host === "jobs.ashbyhq.com" && segments[0]) {
    return makeSource("ashby", segments[0], url);
  }

  return null;
}

async function detectFromPage(url: string): Promise<DetectedSource | null> {
  let html: string;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "JobHubBot/1.0 (+https://jobhub.local)" },
      // Don't follow forever
      redirect: "follow",
    });
    if (!res.ok) return null;
    html = await res.text();
  } catch {
    return null;
  }

  // Greenhouse embeds: boards.greenhouse.io/embed/job_board?for=<slug>
  // or boards.greenhouse.io/<slug> in iframe/link/script
  const ghMatch =
    html.match(/boards\.greenhouse\.io\/embed\/job_board\?for=([a-z0-9_-]+)/i) ||
    html.match(/boards\.greenhouse\.io\/([a-z0-9_-]+)/i) ||
    html.match(/job-boards\.greenhouse\.io\/([a-z0-9_-]+)/i);
  if (ghMatch) return makeSource("greenhouse", ghMatch[1], url);

  // Lever embeds: jobs.lever.co/<slug>
  const leverMatch = html.match(/jobs\.lever\.co\/([a-z0-9_-]+)/i);
  if (leverMatch) return makeSource("lever", leverMatch[1], url);

  // Ashby embeds: jobs.ashbyhq.com/<slug>
  const ashbyMatch = html.match(/jobs\.ashbyhq\.com\/([a-z0-9_-]+)/i);
  if (ashbyMatch) return makeSource("ashby", ashbyMatch[1], url);

  return null;
}

function makeSource(
  atsType: AtsType,
  slug: string,
  sourceUrl: string,
): DetectedSource {
  return {
    atsType,
    atsSlug: slug.toLowerCase(),
    guessedName: titleCaseFromSlug(slug),
    sourceUrl,
  };
}

function titleCaseFromSlug(slug: string): string {
  return slug
    .replace(/[-_]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}
