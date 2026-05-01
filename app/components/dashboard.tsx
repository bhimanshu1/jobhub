import Link from "next/link";
import { prisma } from "@/lib/db";
import type { SessionUser } from "@/lib/auth";
import { timeAgo, greetingForHour, pickName } from "@/lib/format";
import { JobCard } from "@/app/components/job-card";
import { SearchForm } from "@/app/components/search-form";
import { parseSearchQuery, buildSearchWhere } from "@/lib/ai-search";

/**
 * Signed-in dashboard. Rendered from the public root page when a session
 * exists. Takes the user as a prop instead of calling requireUser() so
 * the same code path can be used from any signed-in context.
 */
export async function Dashboard({
  user,
  q,
}: {
  user: SessionUser;
  q: string;
}) {
  const greeting = greetingForHour(new Date().getHours());
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [stats, search, newToday, trackedCount] = await Promise.all([
    Promise.all([
      prisma.job.count({
        where: { isActive: true, company: { userId: user.id } },
      }),
      prisma.company.count({ where: { userId: user.id } }),
      prisma.company.findFirst({
        where: { userId: user.id, lastSyncedAt: { not: null } },
        orderBy: { lastSyncedAt: "desc" },
        select: { lastSyncedAt: true },
      }),
    ]),
    runSearch(q, user.id),
    prisma.job.count({
      where: {
        isActive: true,
        company: { userId: user.id },
        firstSeenAt: { gte: oneDayAgo },
      },
    }),
    prisma.job.count({
      where: {
        userStatus: { not: null },
        company: { userId: user.id },
      },
    }),
  ]);
  const [jobCount, companyCount, lastSync] = stats;

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="text-3xl font-semibold tracking-tight">
        {greeting}, <span className="opacity-70">{pickName(user)}</span>
      </h1>
      <p className="mt-2 italic text-foreground/75">You only need one yes.</p>

      {newToday > 0 && (
        <p className="mt-3 text-sm">
          <Link href="/jobs" className="underline decoration-dotted">
            {newToday.toLocaleString()} new job{newToday === 1 ? "" : "s"} in the
            last 24 hours →
          </Link>
        </p>
      )}

      <SearchForm defaultValue={q} />

      {q ? (
        <SearchResults q={q} search={search!} />
      ) : (
        <WelcomeStats
          jobCount={jobCount}
          companyCount={companyCount}
          lastSync={lastSync?.lastSyncedAt ?? null}
          trackedCount={trackedCount}
        />
      )}
    </div>
  );
}

async function runSearch(q: string, userId: string) {
  if (!q) return null;
  const parsed = await parseSearchQuery(q);
  const where = buildSearchWhere(parsed, userId);
  const jobs = await prisma.job.findMany({
    where,
    orderBy: [{ postedAt: "desc" }, { firstSeenAt: "desc" }],
    take: 60,
    include: {
      company: {
        select: {
          name: true,
          atsType: true,
          atsSlug: true,
          websiteUrl: true,
          logoUrl: true,
        },
      },
    },
  });
  return { parsed, jobs };
}

function SearchResults({
  q,
  search,
}: {
  q: string;
  search: NonNullable<Awaited<ReturnType<typeof runSearch>>>;
}) {
  const { parsed, jobs } = search;
  const chips: { label: string; tone?: "accent" }[] = [];
  parsed.titleKeywords.forEach((k) => chips.push({ label: `title: ${k}` }));
  parsed.locationKeywords.forEach((k) =>
    chips.push({ label: `where: ${k}` }),
  );
  parsed.departmentKeywords.forEach((k) =>
    chips.push({ label: `team: ${k}` }),
  );
  if (parsed.remoteOnly) chips.push({ label: "remote", tone: "accent" });
  if (parsed.freeText) chips.push({ label: `“${parsed.freeText}”` });

  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-sm opacity-70">
          {jobs.length === 0
            ? "No jobs match"
            : `${jobs.length} match${jobs.length === 1 ? "" : "es"}`}{" "}
          · interpreted as
        </span>
        {chips.length > 0 ? (
          chips.map((c, i) => (
            <span
              key={i}
              className={`text-xs px-2 py-0.5 rounded-full border ${
                c.tone === "accent"
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
                  : "bg-black/[0.04] dark:bg-white/[0.06] border-black/10 dark:border-white/10"
              }`}
            >
              {c.label}
            </span>
          ))
        ) : (
          <span className="text-xs opacity-50">(no filters extracted)</span>
        )}
        {!parsed.usedAI && (
          <span
            className="text-[11px] opacity-50"
            title="LLM not configured or unavailable"
          >
            keyword mode
          </span>
        )}
        <Link href="/" className="ml-auto text-xs opacity-60 hover:underline">
          Clear
        </Link>
      </div>

      {jobs.length === 0 ? (
        <div className="text-sm opacity-60 p-6 rounded border border-dashed border-black/15 dark:border-white/15">
          No jobs match &ldquo;{q}&rdquo;. Try a broader query, or{" "}
          <Link href="/admin" className="underline">
            add more companies
          </Link>
          .
        </div>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {jobs.map((j) => (
            <li key={j.id}>
              <JobCard job={j} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function WelcomeStats({
  jobCount,
  companyCount,
  lastSync,
  trackedCount,
}: {
  jobCount: number;
  companyCount: number;
  lastSync: Date | null;
  trackedCount: number;
}) {
  return (
    <>
      <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Active jobs" value={jobCount.toLocaleString()} />
        <Stat label="Companies" value={companyCount.toLocaleString()} />
        <Stat
          label="In pipeline"
          value={trackedCount.toLocaleString()}
          href="/pipeline"
        />
        <Stat label="Last sync" value={lastSync ? timeAgo(lastSync) : "—"} />
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/jobs"
          className="px-4 py-2 rounded bg-foreground text-background text-sm font-medium"
        >
          Browse jobs →
        </Link>
        <Link
          href="/pipeline"
          className="px-4 py-2 rounded border border-black/15 dark:border-white/15 text-sm"
        >
          My pipeline
        </Link>
        <Link
          href="/admin"
          className="px-4 py-2 rounded border border-black/15 dark:border-white/15 text-sm"
        >
          Add a company
        </Link>
      </div>

      {companyCount === 0 && (
        <div className="mt-8 p-4 rounded border border-dashed border-black/15 dark:border-white/15 text-sm">
          You haven&apos;t added any companies yet. Head to{" "}
          <Link href="/admin" className="underline">
            Admin
          </Link>{" "}
          and paste a career-page URL — Greenhouse, Lever, and Ashby boards
          work out of the box.
        </div>
      )}
    </>
  );
}

function Stat({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href?: string;
}) {
  const inner = (
    <div className="p-4 rounded border border-black/10 dark:border-white/10 hover:border-foreground/30 transition">
      <div className="text-xs opacity-60">{label}</div>
      <div className="text-2xl font-semibold tracking-tight mt-1">{value}</div>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}
