// Tiny presentation helpers. No deps, safe to import from server or client.

export function timeAgo(input: Date | string | null | undefined): string {
  if (!input) return "";
  const date = typeof input === "string" ? new Date(input) : input;
  const ms = Date.now() - date.getTime();
  if (Number.isNaN(ms)) return "";
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  const week = Math.floor(day / 7);
  if (week < 5) return `${week}w ago`;
  const month = Math.floor(day / 30);
  if (month < 12) return `${month}mo ago`;
  const year = Math.floor(day / 365);
  return `${year}y ago`;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Deterministic color hue from a name — keeps each company's avatar stable
 * without us having to store a color in the DB.
 */
export function colorFromName(name: string): { bg: string; fg: string } {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) >>> 0;
  }
  const hue = h % 360;
  return {
    bg: `hsl(${hue} 70% 88%)`,
    fg: `hsl(${hue} 60% 28%)`,
  };
}

/** Extract apex-ish hostname from any URL string. Returns null on garbage. */
export function extractDomain(
  url: string | null | undefined,
): string | null {
  if (!url) return null;
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Best-guess company website domain.
 *  1. If we have a stored websiteUrl, use it.
 *  2. Else fall back to "<atsSlug>.com" — works for the majority of
 *     well-known companies whose ATS slug matches their brand domain.
 */
export function guessCompanyDomain(c: {
  websiteUrl?: string | null;
  atsSlug: string;
}): string {
  const fromStored = extractDomain(c.websiteUrl ?? undefined);
  if (fromStored) return fromStored;
  return `${c.atsSlug.replace(/[^a-z0-9-]/gi, "").toLowerCase()}.com`;
}

/** Google's free favicon service — no API key, hotlink-friendly. */
export function faviconUrl(domain: string, size = 128): string {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(
    domain,
  )}&sz=${size}`;
}

/** Time-of-day greeting in a single short word. */
export function greetingForHour(hour: number): string {
  if (hour < 5) return "Burning the midnight oil";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 22) return "Good evening";
  return "Working late";
}

/** Pick a name to display: explicit display name → @username. */
export function pickName(user: {
  displayName?: string | null;
  username: string;
}): string {
  return user.displayName?.trim() || user.username;
}

// ---------------- Job status taxonomy ----------------

export type JobStatusKey =
  | "saved"
  | "applied"
  | "interviewing"
  | "rejected"
  | "offer";

export const JOB_STATUSES: {
  key: JobStatusKey;
  label: string;
  color: string;
}[] = [
  { key: "saved", label: "Saved", color: "sky" },
  { key: "applied", label: "Applied", color: "indigo" },
  { key: "interviewing", label: "Interviewing", color: "amber" },
  { key: "rejected", label: "Rejected", color: "rose" },
  { key: "offer", label: "Offer", color: "emerald" },
];

export function statusMeta(key: string | null | undefined) {
  if (!key) return null;
  return JOB_STATUSES.find((s) => s.key === key) ?? null;
}

/**
 * Tailwind classes for a status pill. Returns a single class string covering
 * background, text, and border. Tailwind needs the literal class names to be
 * present in the source so it can JIT them — hence the explicit map.
 */
export function statusPillClass(key: string): string {
  switch (key) {
    case "saved":
      return "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20";
    case "applied":
      return "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20";
    case "interviewing":
      return "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20";
    case "rejected":
      return "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20";
    case "offer":
      return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20";
    default:
      return "bg-black/[0.04] dark:bg-white/[0.06] border-black/10 dark:border-white/10";
  }
}
