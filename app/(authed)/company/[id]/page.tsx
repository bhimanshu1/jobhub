import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { JobCard } from "@/app/components/job-card";
import { JobsFilterForm } from "@/app/components/jobs-filter-form";
import { timeAgo, guessCompanyDomain } from "@/lib/format";
import { CompanyLogo } from "@/app/components/company-logo";
import { requireUser } from "@/lib/auth";

type SearchParams = Promise<{ q?: string; remote?: string }>;

export default async function CompanyPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: SearchParams;
}) {
  const user = await requireUser();
  const { id } = await params;
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const remoteOnly = sp.remote === "1";

  const company = await prisma.company.findFirst({
    where: { id, userId: user.id },
    include: {
      jobs: {
        where: {
          isActive: true,
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
      },
    },
  });

  if (!company) notFound();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <section className="min-w-0">
        <Link
          href="/jobs"
          className="text-xs opacity-60 hover:underline inline-block mb-3"
        >
          ← All jobs
        </Link>

        <header className="flex items-center gap-4 mb-5">
          <CompanyLogo
            name={company.name}
            domain={guessCompanyDomain(company)}
            logoUrl={company.logoUrl}
            size={56}
            rounded="rounded-lg"
          />
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight">
              {company.name}
            </h1>
            <p className="text-sm opacity-60 mt-0.5">
              {company.jobs.length.toLocaleString()} matching jobs ·{" "}
              <span className="capitalize">{company.atsType}</span>
              {company.lastSyncedAt && (
                <> · synced {timeAgo(company.lastSyncedAt)}</>
              )}
              {" · "}
              <a
                href={company.sourceUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="underline"
              >
                source
              </a>
            </p>
          </div>
        </header>

        <JobsFilterForm
          action={`/company/${company.id}`}
          defaultQ={q}
          defaultRemote={remoteOnly}
          placeholder={`Search ${company.name} jobs…`}
        />

        {company.jobs.length === 0 ? (
          <div className="text-sm opacity-60 p-6 rounded border border-dashed border-black/15 dark:border-white/15">
            No matching jobs. Try clearing filters.
          </div>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {company.jobs.map((j) => (
              <li key={j.id}>
                <JobCard job={j} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
