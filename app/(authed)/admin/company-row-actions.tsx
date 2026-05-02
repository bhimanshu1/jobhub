"use client";

import { useActionState } from "react";
import {
  syncCompanyAction,
  deleteCompanyAction,
  type ActionResult,
} from "../actions";

export function CompanyRowActions({ id }: { id: string }) {
  const [syncState, syncAction, syncing] = useActionState<
    ActionResult | null,
    FormData
  >(syncCompanyAction, null);
  const [deleteState, deleteAction, deleting] = useActionState<
    ActionResult | null,
    FormData
  >(deleteCompanyAction, null);

  const status = syncState ?? deleteState;

  return (
    <div className="flex items-center gap-2">
      {status && !status.ok && (
        <span
          className="text-xs text-red-600 dark:text-red-400 max-w-[60ch] break-words"
          title={status.error}
        >
          {status.error}
        </span>
      )}
      {status && status.ok && (
        <span className="text-xs text-emerald-600 dark:text-emerald-400 max-w-[28ch] truncate">
          {status.message}
        </span>
      )}
      <form action={syncAction}>
        <input type="hidden" name="id" value={id} />
        <button
          type="submit"
          disabled={syncing}
          className="text-sm px-3 py-1.5 rounded border border-black/15 dark:border-white/15 disabled:opacity-50"
        >
          {syncing ? "Syncing…" : "Sync"}
        </button>
      </form>
      <form action={deleteAction}>
        <input type="hidden" name="id" value={id} />
        <button
          type="submit"
          disabled={deleting}
          className="text-sm px-3 py-1.5 rounded border border-red-500/40 text-red-600 dark:text-red-400 hover:bg-red-500/10 disabled:opacity-50"
        >
          {deleting ? "Removing…" : "Remove"}
        </button>
      </form>
    </div>
  );
}
