"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { timeAgo, guessCompanyDomain } from "@/lib/format";
import { CompanyLogo } from "./company-logo";
import { JobStatusMenu } from "./job-status-menu";
import { SummaryArea } from "./summary-area";

export type JobCardData = {
  id: string;
  title: string;
  url: string;
  location: string | null;
  department: string | null;
  employmentType: string | null;
  remote: boolean;
  postedAt: Date | null;
  firstSeenAt: Date;
  description: string | null;
  userStatus: string | null;
  aiSummary: string | null;
  company: {
    name: string;
    atsSlug: string;
    websiteUrl: string | null;
    logoUrl: string | null;
  };
};

/**
 * Click-to-expand JobCard. Renders a compact card in the grid, plus a
 * portal-rendered modal at the document root when expanded.
 *
 *   - Grid card click → modal opens centered, backdrop blurs page
 *   - Click backdrop / Esc → close
 *   - Inner Apply / status menu / summarize buttons don't toggle the modal
 */
export function JobCard({ job }: { job: JobCardData }) {
  const [expanded, setExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Esc to close, body scroll lock while open.
  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [expanded]);

  const when = timeAgo(job.postedAt ?? job.firstSeenAt);
  const domain = guessCompanyDomain(job.company);

  const handleCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("a, button, summary, details"))
      return;
    setExpanded(true);
  };

  const handleCardKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    if ((e.target as HTMLElement).closest("a, button, summary, details"))
      return;
    e.preventDefault();
    setExpanded(true);
  };

  return (
    <>
      {/* Compact card in the grid */}
      <div
        onClick={handleCardClick}
        onKeyDown={handleCardKey}
        role="button"
        tabIndex={0}
        aria-label={`Open details for ${job.title}`}
        className="flex flex-col gap-3 p-4 rounded-lg border border-black/10 dark:border-white/10 bg-background hover:border-foreground/40 hover:shadow-md transition cursor-pointer"
      >
        <div className="flex items-start gap-3 min-w-0">
          <CompanyLogo
            name={job.company.name}
            domain={domain}
            logoUrl={job.company.logoUrl}
            size={36}
          />
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium opacity-70 truncate">
              {job.company.name}
            </div>
            <div className="font-medium leading-snug line-clamp-2">
              {job.title}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 text-[11px]">
          {job.location && <Chip>{job.location}</Chip>}
          {job.department && <Chip>{job.department}</Chip>}
          {job.employmentType && <Chip>{job.employmentType}</Chip>}
          {job.remote && <Chip tone="accent">Remote</Chip>}
        </div>

        <div className="flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <JobStatusMenu jobId={job.id} current={job.userStatus} />
            <span className="opacity-50 truncate">{when}</span>
          </div>
          <a
            href={job.url}
            target="_blank"
            rel="noreferrer noopener"
            className="shrink-0 px-2.5 py-1 rounded border border-black/15 dark:border-white/15 hover:bg-foreground hover:text-background transition"
          >
            Apply →
          </a>
        </div>
      </div>

      {/* Centered modal when expanded */}
      {mounted &&
        expanded &&
        createPortal(
          <ExpandedCard job={job} onClose={() => setExpanded(false)} />,
          document.body,
        )}
    </>
  );
}

function ExpandedCard({
  job,
  onClose,
}: {
  job: JobCardData;
  onClose: () => void;
}) {
  const when = timeAgo(job.postedAt ?? job.firstSeenAt);
  const domain = guessCompanyDomain(job.company);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop — click to close */}
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="jh-modal-backdrop fixed inset-0 bg-black/45 backdrop-blur-md cursor-default"
      />

      {/* Card content */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={job.title}
        className="jh-modal-card relative z-10 w-full max-w-xl max-h-[85vh] overflow-y-auto rounded-xl border border-black/10 dark:border-white/10 bg-background shadow-2xl"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 z-20 inline-flex items-center justify-center w-8 h-8 rounded-full hover:bg-black/[0.06] dark:hover:bg-white/[0.08] text-foreground/70 hover:text-foreground"
        >
          <CloseIcon />
        </button>

        <div className="p-6 flex flex-col gap-5">
          <div className="flex items-start gap-4 pr-8">
            <CompanyLogo
              name={job.company.name}
              domain={domain}
              logoUrl={job.company.logoUrl}
              size={56}
              rounded="rounded-lg"
            />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium opacity-70">
                {job.company.name}
              </div>
              <h2 className="text-xl font-semibold leading-snug mt-0.5">
                {job.title}
              </h2>
              {when && (
                <div className="text-xs opacity-50 mt-1">Posted {when}</div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 text-xs">
            {job.location && <Chip>{job.location}</Chip>}
            {job.department && <Chip>{job.department}</Chip>}
            {job.employmentType && <Chip>{job.employmentType}</Chip>}
            {job.remote && <Chip tone="accent">Remote</Chip>}
          </div>

          <div className="border-t border-black/5 dark:border-white/5 pt-4">
            <SummaryArea
              jobId={job.id}
              description={job.description}
              initialSummary={job.aiSummary}
            />
          </div>

          <div className="flex items-center justify-between gap-2 mt-2 pt-4 border-t border-black/5 dark:border-white/5">
            <JobStatusMenu jobId={job.id} current={job.userStatus} />
            <a
              href={job.url}
              target="_blank"
              rel="noreferrer noopener"
              className="px-4 py-2 rounded bg-foreground text-background text-sm font-medium"
            >
              Apply →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function Chip({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "accent";
}) {
  const cls =
    tone === "accent"
      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20"
      : "bg-black/[0.04] dark:bg-white/[0.06] border-black/10 dark:border-white/10";
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full border ${cls}`}
    >
      {children}
    </span>
  );
}

function CloseIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </svg>
  );
}
