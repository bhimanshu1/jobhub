"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

/**
 * Client-side filter form for the /jobs and /company/[id] pages.
 * Submits via router.push so the page does a soft RSC navigation
 * instead of a full reload.
 */
export function JobsFilterForm({
  action,
  defaultQ = "",
  defaultRemote = false,
  placeholder = "Search title, location, team…",
  hiddenInputs = {},
}: {
  action: string;
  defaultQ?: string;
  defaultRemote?: boolean;
  placeholder?: string;
  hiddenInputs?: Record<string, string>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const params = new URLSearchParams();
    fd.forEach((v, k) => {
      const s = String(v).trim();
      if (s) params.set(k, s);
    });
    const target = params.toString() ? `${action}?${params}` : action;
    startTransition(() => router.push(target));
  };

  return (
    <form
      onSubmit={onSubmit}
      className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2 mb-5"
    >
      {Object.entries(hiddenInputs).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <input
        name="q"
        defaultValue={defaultQ}
        placeholder={placeholder}
        autoComplete="off"
        className="px-3 py-2 rounded border border-black/15 dark:border-white/15 bg-transparent"
      />
      <label className="inline-flex items-center gap-2 px-3 py-2 rounded border border-black/15 dark:border-white/15">
        <input
          type="checkbox"
          name="remote"
          value="1"
          defaultChecked={defaultRemote}
        />
        <span className="text-sm">Remote only</span>
      </label>
      <button
        type="submit"
        disabled={pending}
        className="px-4 py-2 rounded bg-foreground text-background text-sm font-medium disabled:opacity-50"
      >
        {pending ? "Filtering…" : "Filter"}
      </button>
    </form>
  );
}
