import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in · JobHub" };

export default async function LoginPage() {
  if (await getSessionUser()) redirect("/");

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-2xl font-semibold tracking-tight mb-1">Sign in</h1>
      <p className="text-sm opacity-60 mb-6">Welcome back to JobHub.</p>
      <LoginForm />
      <p className="text-sm mt-4 opacity-70">
        New here?{" "}
        <Link href="/signup" className="underline">
          Create an account
        </Link>
        .
      </p>
    </div>
  );
}
