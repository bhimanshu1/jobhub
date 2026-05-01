"use client";

import { useActionState } from "react";
import {
  setDisplayNameAction,
  type ActionResult,
} from "@/app/(authed)/actions";

export function DisplayNameForm({ initial }: { initial: string }) {
  const [state, action, pending] = useActionState<ActionResult | null, FormData>(
    setDisplayNameAction,
    null,
  );
  return (
    <form action={action} className="flex flex-col sm:flex-row gap-2">
      <input
        name="displayName"
        defaultValue={initial}
        placeholder="Your name"
        maxLength={60}
        className="flex-1 px-3 py-2 rounded border border-black/15 dark:border-white/15 bg-transparent"
      />
      <button
        type="submit"
        disabled={pending}
        className="px-4 py-2 rounded bg-foreground text-background text-sm font-medium disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save"}
      </button>
      {state && (
        <p
          className={`text-sm self-center ${
            state.ok
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-red-600 dark:text-red-400"
          }`}
        >
          {state.ok ? state.message : state.error}
        </p>
      )}
    </form>
  );
}
