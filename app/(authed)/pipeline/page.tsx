import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { JobCard } from "@/app/components/job-card";
import { JOB_STATUSES, statusPillClass, type JobStatusKey } from "@/lib/format";
import Link from "next/link";

export const metadata = { title: "Pipeline · JobHub" };

export default async function PipelinePage() {
  const user = await requireUser();

  // Pull every tracked job for this user in a single query, then bucket
  // them in memory — cheap for personal scale (hundreds, not millions).
  const jobs = await prisma.job.findMany({
    where: {
      userStatus: { not: null },
      company: { userId: user.id },
    },
    orderBy: [{ userStatusAt: "desc" }, { firstSeenAt: "desc" }],
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

  const byStatus = new Map<JobStatusKey, typeof jobs>(
    JOB_STATUSES.map((s) => [s.key, []]),
  );
  for (const j of jobs) {
    const key = j.userStatus as JobStatusKey | null;
    if (key && byStatus.has(key)) byStatus.get(key)!.push(j);
  }
  const total = jobs.length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Pipeline</h1>
        <p className="text-sm opacity-60 mt-1">
          {total === 0
            ? "Nothing here yet — track jobs from the listings to see them here."
            : `${total} tracked job${total === 1 ? "" : "s"} across ${
                JOB_STATUSES.filter((s) => (byStatus.get(s.key) ?? []).length > 0)
                  .length
              } stage${total === 1 ? "" : "s"}.`}
        </p>
      </header>

      {total === 0 ? (
        <div className="text-sm opacity-60 p-6 rounded border border-dashed border-black/15 dark:border-white/15">
          On any job card, click <strong>+ Track</strong> and pick a status.
          Tracked jobs show up here grouped by stage.{" "}
          <Link href="/jobs" className="underline">
            Browse jobs →
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {JOB_STATUSES.map((s) => {
            const list = byStatus.get(s.key) ?? [];
            if (list.length === 0) return null;
            return (
              <section key={s.key}>
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full border text-xs ${statusPillClass(
                      s.key,
                    )}`}
                  >
                    {s.label}
                  </span>
                  <span className="text-xs opacity-50">
                    {list.length} job{list.length === 1 ? "" : "s"}
                  </span>
                </div>
                <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {list.map((j) => (
                    <li key={j.id}>
                      <JobCard job={j} />
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
