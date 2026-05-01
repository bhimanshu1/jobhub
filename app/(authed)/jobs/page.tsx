import { prisma } from "@/lib/db";
import Link from "next/link";
import { JobCard } from "@/app/components/job-card";
import { JobsFilterForm } from "@/app/components/jobs-filter-form";
import { requireUser } from "@/lib/auth";

type SearchParams = Promise<{
  q?: string;
  company?: string;
  remote?: string;
}>;

export default async function HomePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const companyId = sp.company ?? "";
  const remoteOnly = sp.remote === "1";

  // All queries are scoped to companies belonging to the current user.
  const userCompaniesFilter = { company: { userId: user.id } };

  const [jobs, totalActive, companyCount, activeCompany] = await Promise.all([
    prisma.job.findMany({
      where: {
        isActive: true,
        ...userCompaniesFilter,
        ...(companyId ? { companyId } : {}),
        ...(remoteOnly ? { remote: true } : {}),
        ...(q
          ? {
              OR: [
                { title: { contains: q } },
                { location: { contains: q } },
                { department: { contains: q } },
              ],
            }
          : {}),
      },
      orderBy: [{ postedAt: "desc" }, { firstSeenAt: "desc" }],
      take: 200,
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
    }),
    prisma.job.count({
      where: { isActive: true, ...userCompaniesFilter },
    }),
    prisma.company.count({ where: { userId: user.id } }),
    companyId
      ? prisma.company.findFirst({
          where: { id: companyId, userId: user.id },
          select: {
            id: true,
            name: true,
            _count: { select: { jobs: { where: { isActive: true } } } },
          },
        })
      : Promise.resolve(null),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <section className="min-w-0">
        <header className="mb-5">
          <h1 className="text-2xl font-semibold tracking-tight">
            {activeCompany ? activeCompany.name : "All jobs"}
          </h1>
          <p className="text-sm opacity-60 mt-1">
            {jobs.length === 0 && totalActive === 0 ? (
              <>
                No jobs yet —{" "}
                <Link href="/admin" className="underline">
                  add your first career page
                </Link>
                .
              </>
            ) : activeCompany ? (
              <>
                {activeCompany._count.jobs.toLocaleString()} active jobs ·{" "}
                <Link
                  href={`/company/${activeCompany.id}`}
                  className="underline"
                >
                  open page
                </Link>
              </>
            ) : (
              <>
                {totalActive.toLocaleString()} active jobs from {companyCount}{" "}
                companies
              </>
            )}
          </p>
        </header>

        <JobsFilterForm
          action="/jobs"
          defaultQ={q}
          defaultRemote={remoteOnly}
          hiddenInputs={companyId ? { company: companyId } : {}}
        />

        {jobs.length === 0 ? (
          <div className="text-sm opacity-60 p-6 rounded border border-dashed border-black/15 dark:border-white/15">
            No jobs match. Try clearing filters.
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

        {jobs.length === 200 && (
          <p className="text-xs opacity-60 mt-3">
            Showing the first 200 results — narrow your search to see more.
          </p>
        )}
      </section>
    </div>
  );
}
