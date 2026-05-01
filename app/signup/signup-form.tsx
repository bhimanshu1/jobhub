"use client";

import { useActionState } from "react";
import { signupAction, type AuthFormState } from "../(auth)/auth-actions";

export function SignupForm() {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(
    signupAction,
    null,
  );
  return (
    <form action={action} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        <span className="opacity-70">Username</span>
        <input
          name="username"
          autoComplete="username"
          required
          minLength={3}
          maxLength={32}
          pattern="[a-zA-Z0-9_\-]+"
          className="px-3 py-2 rounded border border-black/15 dark:border-white/15 bg-transparent"
        />
        <span className="text-xs opacity-50">
          3–32 chars · letters, numbers, underscore, dash.
        </span>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="opacity-70">Password</span>
        <input
          type="password"
          name="password"
          autoComplete="new-password"
          required
          minLength={8}
          maxLength={128}
          className="px-3 py-2 rounded border border-black/15 dark:border-white/15 bg-transparent"
        />
        <span className="text-xs opacity-50">At least 8 characters.</span>
      </label>
      <button
        type="submit"
        disabled={pending}
        className="px-4 py-2 rounded bg-foreground text-background text-sm font-medium disabled:opacity-50"
      >
        {pending ? "Creating…" : "Create account"}
      </button>
      {state?.error && (
        <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
      )}
    </form>
  );
}
