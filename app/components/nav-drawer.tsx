"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { guessCompanyDomain } from "@/lib/format";
import { CompanyLogo } from "./company-logo";

type CompanyForDrawer = {
  id: string;
  name: string;
  atsSlug: string;
  websiteUrl: string | null;
  logoUrl: string | null;
  _count: { jobs: number };
};

export function NavDrawer({
  companies,
  totalJobs,
}: {
  companies: CompanyForDrawer[];
  totalJobs: number;
}) {
  const [open, setOpen] = useState(false);
  const [companiesOpen, setCompaniesOpen] = useState(true);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Lock body scroll while drawer is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <>
      <button
        type="button"
        aria-label="Open navigation"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center w-9 h-9 rounded hover:bg-black/[0.06] dark:hover:bg-white/[0.08] transition"
      >
        <HamburgerIcon />
      </button>

      {/* Backdrop */}
      <div
        aria-hidden
        onClick={close}
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* Drawer panel */}
      <aside
        role="dialog"
        aria-label="Navigation"
        aria-hidden={!open}
        className={`fixed top-0 left-0 z-50 h-dvh w-72 max-w-[85vw] bg-background border-r border-black/10 dark:border-white/10 shadow-xl flex flex-col transition-transform duration-200 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-black/10 dark:border-white/10">
          <span className="font-semibold tracking-tight">JobHub</span>
          <button
            type="button"
            aria-label="Close navigation"
            onClick={close}
            className="inline-flex items-center justify-center w-8 h-8 rounded hover:bg-black/[0.06] dark:hover:bg-white/[0.08]"
          >
            <CloseIcon />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-2">
          <DrawerLink href="/" onClick={close}>
            Home
          </DrawerLink>
          <DrawerLink href="/pipeline" onClick={close}>
            Pipeline
          </DrawerLink>
          <DrawerLink href="/admin" onClick={close}>
            Admin
          </DrawerLink>
          <DrawerLink href="/settings" onClick={close}>
            Settings
          </DrawerLink>

          <div className="mt-4">
            <button
              type="button"
              onClick={() => setCompaniesOpen((o) => !o)}
              aria-expanded={companiesOpen}
              className="w-full flex items-center gap-2 px-3 py-2 rounded text-sm font-medium hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
            >
              <span>Companies</span>
              <span className="text-xs opacity-60">({companies.length})</span>
              <span
                className={`ml-auto inline-block transition-transform ${
                  companiesOpen ? "rotate-180" : ""
                }`}
                aria-hidden
              >
                <ChevronDown />
              </span>
            </button>

            {companiesOpen && (
              <ul className="mt-1 pl-1">
                <li>
                  <Link
                    href="/jobs"
                    onClick={close}
                    className="flex items-center gap-2 px-3 py-1.5 rounded text-sm hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                  >
                    <span
                      aria-hidden
                      className="shrink-0 inline-flex items-center justify-center w-6 h-6 rounded text-[10px] font-semibold bg-foreground/10"
                    >
                      ★
                    </span>
                    <span className="flex-1 truncate">All jobs</span>
                    <span className="text-xs opacity-50">{totalJobs}</span>
                  </Link>
                </li>
                {companies.length === 0 ? (
                  <li className="px-3 py-2 text-xs opacity-60">
                    No companies yet.{" "}
                    <Link
                      href="/admin"
                      onClick={close}
                      className="underline"
                    >
                      Add one
                    </Link>
                    .
                  </li>
                ) : (
                  companies.map((c) => (
                    <li key={c.id}>
                      <Link
                        href={`/company/${c.id}`}
                        onClick={close}
                        className="flex items-center gap-2 px-3 py-1.5 rounded text-sm hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                      >
                        <CompanyLogo
                          name={c.name}
                          domain={guessCompanyDomain(c)}
                          logoUrl={c.logoUrl}
                          size={24}
                          rounded="rounded"
                        />
                        <span className="flex-1 truncate">{c.name}</span>
                        <span className="text-xs opacity-50">
                          {c._count.jobs}
                        </span>
                      </Link>
                    </li>
                  ))
                )}
              </ul>
            )}
          </div>
        </nav>
      </aside>
    </>
  );
}

function DrawerLink({
  href,
  children,
  onClick,
}: {
  href: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center px-3 py-2 rounded text-sm hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
    >
      {children}
    </Link>
  );
}

function HamburgerIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <line x1="4" y1="7" x2="20" y2="7" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="17" x2="20" y2="17" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="18"
      height="18"
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

function ChevronDown() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}
