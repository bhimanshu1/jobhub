"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { RotatingSearchInput } from "./rotating-search-input";

/**
 * Home-page search form — submits via client-side navigation so the page
 * doesn't hard-reload. Wraps the typewriter input + submit button.
 */
export function SearchForm({ defaultValue = "" }: { defaultValue?: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const q = ((fd.get("q") as string | null) ?? "").trim();
    const target = q ? `/?q=${encodeURIComponent(q)}` : "/";
    startTransition(() => router.push(target));
  };

  return (
    <form onSubmit={handleSubmit} className="mt-8" role="search">
      <div className="flex flex-col sm:flex-row gap-2">
        <RotatingSearchInput defaultValue={defaultValue} />
        <button
          type="submit"
          disabled={pending}
          className="px-5 py-3 rounded-lg bg-foreground text-background text-sm font-medium disabled:opacity-50"
        >
          {pending ? "Searching…" : "Search"}
        </button>
      </div>
    </form>
  );
}
