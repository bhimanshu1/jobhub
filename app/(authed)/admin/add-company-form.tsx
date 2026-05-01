"use client";

import { useActionState } from "react";
import { addCompanyAction, type ActionResult } from "../actions";

export function AddCompanyForm() {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    addCompanyAction,
    null,
  );

  return (
    <form action={action} className="flex flex-col gap-2">
      <div className="grid grid-cols-1 sm:grid-cols-[2fr_1fr_auto] gap-2">
        <input
          name="url"
          required
          placeholder="https://boards.greenhouse.io/stripe"
          className="px-3 py-2 rounded border border-black/15 dark:border-white/15 bg-transparent"
        />
        <input
          name="name"
          placeholder="Display name (optional)"
          className="px-3 py-2 rounded border border-black/15 dark:border-white/15 bg-transparent"
        />
        <button
          type="submit"
          disabled={pending}
          className="px-4 py-2 rounded bg-foreground text-background text-sm font-medium disabled:opacity-50"
        >
          {pending ? "Adding…" : "Add & sync"}
        </button>
      </div>
      {state && (
        <p
          className={`text-sm mt-1 ${
            state.ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
          }`}
        >
          {state.ok ? state.message : state.error}
        </p>
      )}
    </form>
  );
}
