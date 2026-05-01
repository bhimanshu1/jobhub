"use client";

import { useState } from "react";
import { initials, colorFromName, faviconUrl } from "@/lib/format";

/**
 * Renders a company logo with a multi-source fallback chain:
 *
 *   1. Explicit `logoUrl` if you've stored one.
 *   2. icon.horse — returns proper 404 for unknown domains (so onError fires).
 *   3. Google's favicon service — almost always returns *something*, used as
 *      last network attempt.
 *   4. A colored-initial badge — local fallback that never breaks.
 */
export function CompanyLogo({
  name,
  domain,
  logoUrl,
  size = 36,
  rounded = "rounded-md",
}: {
  name: string;
  domain?: string | null;
  logoUrl?: string | null;
  size?: number;
  rounded?: string;
}) {
  const sources: string[] = [];
  if (logoUrl) sources.push(logoUrl);
  if (domain) {
    sources.push(`https://icon.horse/icon/${encodeURIComponent(domain)}`);
    sources.push(faviconUrl(domain, 128));
  }

  const [idx, setIdx] = useState(0);
  const [errored, setErrored] = useState(false);
  const src = sources[idx];

  if (!src || errored) {
    const c = colorFromName(name);
    return (
      <span
        aria-hidden
        className={`shrink-0 inline-flex items-center justify-center font-semibold ${rounded}`}
        style={{
          width: size,
          height: size,
          backgroundColor: c.bg,
          color: c.fg,
          fontSize: Math.round(size * 0.34),
        }}
      >
        {initials(name)}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      onError={() => {
        if (idx + 1 < sources.length) setIdx(idx + 1);
        else setErrored(true);
      }}
      className={`shrink-0 object-contain bg-white dark:bg-white/90 ${rounded}`}
      style={{ width: size, height: size, padding: Math.round(size * 0.08) }}
    />
  );
}
