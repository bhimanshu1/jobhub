"use client";

import { useActionState } from "react";
import {
  setJobStatusAction,
  type ActionResult,
} from "@/app/(authed)/actions";
import {
  JOB_STATUSES,
  statusMeta,
  statusPillClass,
} from "@/lib/format";

/**
 * Status menu shown on every JobCard. Uses native <details>/<summary> for
 * popover behavior (no JS framework needed for open/close — browser handles
 * that). Each option is its own <form> so clicking it submits the action.
 */
export function JobStatusMenu({
  jobId,
  current,
}: {
  jobId: string;
  current: string | null;
}) {
  const meta = statusMeta(current);

  return (
    <details className="jh-status-menu relative">
      <summary
        className={`list-none cursor-pointer select-none inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] hover:opacity-90 ${
          meta
            ? statusPillClass(meta.key)
            : "border-dashed border-black/20 dark:border-white/20 opacity-60"
        }`}
        // Hide the default disclosure triangle in webkit.
        style={{ listStyle: "none" }}
      >
        {meta ? meta.label : "+ Track"}
      </summary>
      <div className="absolute z-20 mt-1 left-0 min-w-[10rem] rounded-md border border-black/10 dark:border-white/10 bg-background shadow-md p-1">
        {JOB_STATUSES.map((s) => (
          <StatusForm
            key={s.key}
            jobId={jobId}
            target={s.key}
            label={s.label}
            current={current}
          />
        ))}
        {current && (
          <>
            <div className="my-1 border-t border-black/10 dark:border-white/10" />
            <StatusForm
              jobId={jobId}
              target=""
              label="Clear status"
              current={current}
              danger
            />
          </>
        )}
      </div>
    </details>
  );
}

function StatusForm({
  jobId,
  target,
  label,
  current,
  danger,
}: {
  jobId: string;
  target: string; // "" to clear
  label: string;
  current: string | null;
  danger?: boolean;
}) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    setJobStatusAction,
    null,
  );
  const isCurrent = target && current === target;

  return (
    <form action={action}>
      <input type="hidden" name="jobId" value={jobId} />
      <input type="hidden" name="status" value={target} />
      <button
        type="submit"
        disabled={pending}
        className={`w-full text-left px-2 py-1.5 rounded text-xs hover:bg-black/[0.04] dark:hover:bg-white/[0.06] disabled:opacity-50 ${
          isCurrent ? "font-semibold" : ""
        } ${danger ? "text-red-600 dark:text-red-400" : ""}`}
      >
        {pending ? "Saving…" : isCurrent ? `✓ ${label}` : label}
      </button>
      {state && !state.ok && (
        <span className="text-[10px] text-red-600 dark:text-red-400 px-2">
          {state.error}
        </span>
      )}
    </form>
  );
}
