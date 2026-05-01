import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { AddCompanyForm } from "./add-company-form";
import { CompanyRowActions } from "./company-row-actions";

export default async function AdminPage() {
  const user = await requireUser();
  const companies = await prisma.company.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { jobs: { where: { isActive: true } } } },
    },
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
      <p className="text-sm opacity-60 mt-1">
        Add a company by pasting any career-page URL. Supports Greenhouse,
        Lever, and Ashby out of the box.
      </p>

      <section className="mt-6 p-4 rounded border border-black/10 dark:border-white/10">
        <h2 className="font-medium mb-3">Add a career page</h2>
        <AddCompanyForm />
        <ul className="mt-3 text-xs opacity-60 list-disc pl-5 space-y-1">
          <li>Direct ATS URL: <code>https://boards.greenhouse.io/stripe</code></li>
          <li>Lever: <code>https://jobs.lever.co/netflix</code></li>
          <li>Ashby: <code>https://jobs.ashbyhq.com/openai</code></li>
          <li>
            A company&apos;s own <code>/careers</code> page also works if it
            embeds one of the above.
          </li>
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="font-medium mb-3">
          Tracked companies ({companies.length})
        </h2>
        {companies.length === 0 ? (
          <p className="text-sm opacity-60">None yet — add one above.</p>
        ) : (
          <ul className="divide-y divide-black/10 dark:divide-white/10 border border-black/10 dark:border-white/10 rounded">
            {companies.map((c) => (
              <li
                key={c.id}
                className="px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
              >
                <div className="min-w-0">
                  <div className="font-medium">{c.name}</div>
                  <div className="text-xs opacity-60 mt-0.5">
                    {c.atsType} · {c.atsSlug} · {c._count.jobs} active jobs
                    {c.lastSyncedAt && (
                      <>
                        {" · synced "}
                        {new Date(c.lastSyncedAt).toLocaleString()}
                      </>
                    )}
                    {c.lastSyncError && (
                      <span className="text-red-600 dark:text-red-400">
                        {" · error: "}
                        {c.lastSyncError}
                      </span>
                    )}
                  </div>
                </div>
                <CompanyRowActions id={c.id} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
