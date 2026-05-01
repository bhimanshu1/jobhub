"use client";

import { useState, useTransition } from "react";
import { summarizeJobAction } from "@/app/(authed)/actions";

/**
 * Shown inside the JobCard's hover-expanded section.
 *
 * - If we already have an AI summary, render it.
 * - Else show a 3-line preview of the raw description plus a "✨ Summarize"
 *   button that calls the server action and replaces the preview with the
 *   resulting summary (also cached server-side).
 */
export function SummaryArea({
  jobId,
  description,
  initialSummary,
}: {
  jobId: string;
  description: string | null;
  initialSummary: string | null;
}) {
  const [summary, setSummary] = useState<string | null>(initialSummary);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (summary) {
    return (
      <p className="text-xs leading-relaxed opacity-75">
        <span aria-hidden className="opacity-60 mr-1">
          ✨
        </span>
        {summary}
      </p>
    );
  }

  if (!description) {
    return (
      <p className="text-xs italic opacity-50">No description available.</p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs leading-relaxed opacity-75 line-clamp-3">
        {description}
      </p>
      <button
        type="button"
        disabled={pending}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setError(null);
          startTransition(async () => {
            const result = await summarizeJobAction(jobId);
            if (result.ok) setSummary(result.summary);
            else setError(result.error);
          });
        }}
        className="text-[11px] px-2 py-0.5 rounded border border-foreground/20 hover:bg-foreground/5 disabled:opacity-50 transition"
      >
        {pending ? "Summarizing…" : "✨ Summarize with AI"}
      </button>
      {error && (
        <p className="text-[11px] text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
