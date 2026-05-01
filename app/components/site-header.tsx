import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { pickName } from "@/lib/format";
import { NavDrawer } from "./nav-drawer";
import { signoutAction } from "@/app/(auth)/auth-actions";

export async function SiteHeader() {
  const user = await getSessionUser();

  // For signed-out visitors, render a minimal header — no drawer, no DB hit.
  if (!user) {
    return (
      <header className="border-b border-black/10 dark:border-white/10 sticky top-0 bg-background/80 backdrop-blur z-[60]">
        <div className="mx-auto max-w-6xl px-3 py-2 flex items-center gap-3">
          <Link href="/" className="font-semibold tracking-tight">
            JobHub
          </Link>
          <nav className="ml-auto flex items-center gap-3 text-sm">
            <Link href="/login" className="hover:underline">
              Sign in
            </Link>
            <Link
              href="/signup"
              className="px-3 py-1.5 rounded bg-foreground text-background text-sm font-medium"
            >
              Sign up
            </Link>
          </nav>
        </div>
      </header>
    );
  }

  const [companies, totalJobs] = await Promise.all([
    prisma.company.findMany({
      where: { userId: user.id },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        atsSlug: true,
        websiteUrl: true,
        logoUrl: true,
        _count: { select: { jobs: { where: { isActive: true } } } },
      },
    }),
    prisma.job.count({
      where: { isActive: true, company: { userId: user.id } },
    }),
  ]);

  return (
    <header className="border-b border-black/10 dark:border-white/10 sticky top-0 bg-background/80 backdrop-blur z-[60]">
      <div className="mx-auto max-w-6xl px-3 py-2 flex items-center gap-3">
        <NavDrawer companies={companies} totalJobs={totalJobs} />
        <Link href="/" className="font-semibold tracking-tight">
          JobHub
        </Link>
        <nav className="ml-auto flex items-center gap-2 sm:gap-4 text-sm">
          <Link href="/" className="hidden sm:inline hover:underline">
            Home
          </Link>
          <Link href="/jobs" className="hidden sm:inline hover:underline">
            Jobs
          </Link>
          <Link href="/admin" className="hidden sm:inline hover:underline">
            Admin
          </Link>
          <span className="opacity-60 text-xs hidden sm:inline">·</span>
          <Link
            href="/settings"
            className="opacity-80 hover:opacity-100 hover:underline"
            title={`Signed in as @${user.username}`}
          >
            {pickName(user)}
          </Link>
          <form action={signoutAction}>
            <button
              type="submit"
              className="text-sm px-2 py-1 rounded border border-black/15 dark:border-white/15 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
            >
              Sign out
            </button>
          </form>
        </nav>
      </div>
    </header>
  );
}
