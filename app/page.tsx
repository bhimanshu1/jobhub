import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { Dashboard } from "@/app/components/dashboard";

type SearchParams = Promise<{ q?: string }>;

/**
 * Public root. Branches based on auth state:
 *   - Signed-in users: render the dashboard (greeting + AI search + stats).
 *   - Signed-out users: render the marketing landing page.
 *
 * This sits OUTSIDE the (authed) route group so anonymous visitors aren't
 * redirected to /login.
 */
export default async function RootPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await getSessionUser();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();

  if (user) {
    return <Dashboard user={user} q={q} />;
  }

  return <Landing />;
}

function Landing() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-20 text-center">
      <p className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
        Track jobs from every company you care about
      </p>

      <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight mt-6 leading-tight">
        Your personal job-search command center.
      </h1>

      <p className="mt-4 text-base sm:text-lg opacity-70 max-w-xl mx-auto">
        Add the career pages of any companies you want to follow. Search
        across all of them with plain English. Track every application from
        first interest to offer.
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/signup"
          className="px-5 py-2.5 rounded-lg bg-foreground text-background text-sm font-medium"
        >
          Create free account
        </Link>
        <Link
          href="/login"
          className="px-5 py-2.5 rounded-lg border border-black/15 dark:border-white/15 text-sm"
        >
          Sign in
        </Link>
      </div>

      <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
        <Feature
          title="Aggregate any career page"
          body="Paste a Greenhouse, Lever, or Ashby URL and we'll auto-detect the source and pull the jobs."
        />
        <Feature
          title="AI search across everything"
          body="“remote ML engineer in Berlin” → real filters, real matches. Plain English in, structured results out."
        />
        <Feature
          title="Pipeline that doesn't lose track"
          body="Saved → Applied → Interviewing → Offer. Personal notes per job. AI-summarized descriptions on demand."
        />
      </div>

      <p className="mt-16 text-xs opacity-50">
        Free to use. No credit card.{" "}
        <Link href="/legal/privacy" className="underline">
          Privacy
        </Link>{" "}
        ·{" "}
        <Link href="/legal/terms" className="underline">
          Terms
        </Link>
      </p>
    </div>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="p-4 rounded-lg border border-black/10 dark:border-white/10">
      <h3 className="font-medium">{title}</h3>
      <p className="text-sm opacity-70 mt-1">{body}</p>
    </div>
  );
}
