import Link from "next/link";
import { initials, colorFromName } from "@/lib/format";

type CompanyForSidebar = {
  id: string;
  name: string;
  atsType: string;
  _count: { jobs: number };
};

export function CompaniesSidebar({
  companies,
  activeCompanyId,
  totalJobs,
  basePath = "/",
  preserveQuery,
}: {
  companies: CompanyForSidebar[];
  activeCompanyId?: string;
  totalJobs: number;
  basePath?: string;
  /** Existing search params to preserve when switching company. */
  preserveQuery?: Record<string, string | undefined>;
}) {
  const buildHref = (companyId?: string) => {
    const params = new URLSearchParams();
    if (preserveQuery) {
      for (const [k, v] of Object.entries(preserveQuery)) {
        if (v && k !== "company") params.set(k, v);
      }
    }
    // "All companies" goes to the basePath (typically "/").
    if (!companyId) {
      const q = params.toString();
      return q ? `${basePath}?${q}` : basePath;
    }
    // A specific company uses the dedicated, shareable route.
    const q = params.toString();
    return q ? `/company/${companyId}?${q}` : `/company/${companyId}`;
  };

  return (
    <aside className="md:sticky md:top-4 md:self-start">
      <div className="text-xs font-semibold uppercase tracking-wider opacity-60 mb-2">
        Companies
      </div>
      <nav className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible -mx-1 px-1 pb-2 md:pb-0">
        <SidebarItem
          href={buildHref(undefined)}
          active={!activeCompanyId}
          label="All companies"
          count={totalJobs}
        />
        {companies.map((c) => (
          <SidebarItem
            key={c.id}
            href={buildHref(c.id)}
            active={activeCompanyId === c.id}
            label={c.name}
            count={c._count.jobs}
            avatar={
              <span
                aria-hidden
                className="shrink-0 inline-flex items-center justify-center w-6 h-6 rounded text-[10px] font-semibold"
                style={(() => {
                  const c2 = colorFromName(c.name);
                  return { backgroundColor: c2.bg, color: c2.fg };
                })()}
              >
                {initials(c.name)}
              </span>
            }
          />
        ))}
      </nav>
    </aside>
  );
}

function SidebarItem({
  href,
  active,
  label,
  count,
  avatar,
}: {
  href: string;
  active: boolean;
  label: string;
  count: number;
  avatar?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`shrink-0 md:shrink flex items-center gap-2 px-2.5 py-1.5 rounded text-sm whitespace-nowrap md:whitespace-normal transition ${
        active
          ? "bg-foreground text-background"
          : "hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
      }`}
    >
      {avatar}
      <span className="flex-1 truncate">{label}</span>
      <span className={`text-xs ${active ? "opacity-80" : "opacity-50"}`}>
        {count}
      </span>
    </Link>
  );
}
