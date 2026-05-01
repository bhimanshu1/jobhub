import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { SignupForm } from "./signup-form";

export const metadata = { title: "Create account · JobHub" };

export default async function SignupPage() {
  if (await getSessionUser()) redirect("/");

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-2xl font-semibold tracking-tight mb-1">
        Create your account
      </h1>
      <p className="text-sm opacity-60 mb-6">
        Pick a username and password — that&apos;s it.
      </p>
      <SignupForm />
      <p className="text-sm mt-4 opacity-70">
        Already have an account?{" "}
        <Link href="/login" className="underline">
          Sign in
        </Link>
        .
      </p>
    </div>
  );
}
