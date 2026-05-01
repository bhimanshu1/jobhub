"use client";

import { useActionState } from "react";
import { loginAction, type AuthFormState } from "../(auth)/auth-actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(
    loginAction,
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
          className="px-3 py-2 rounded border border-black/15 dark:border-white/15 bg-transparent"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="opacity-70">Password</span>
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          required
          className="px-3 py-2 rounded border border-black/15 dark:border-white/15 bg-transparent"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="px-4 py-2 rounded bg-foreground text-background text-sm font-medium disabled:opacity-50"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
      {state?.error && (
        <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
      )}
    </form>
  );
}
