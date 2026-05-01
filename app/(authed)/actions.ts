"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { detectAtsFromUrl } from "@/lib/ats";
import { syncCompany } from "@/lib/sync";
import { requireUser } from "@/lib/auth";
import type { JobStatusKey } from "@/lib/format";
import { summarizeJD, aiSummaryConfigured } from "@/lib/ai-summary";

export type ActionResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

const VALID_STATUSES: JobStatusKey[] = [
  "saved",
  "applied",
  "interviewing",
  "rejected",
  "offer",
];

/**
 * Set or clear the user's status on a job. Sending an empty string clears it.
 * Always re-validates that the job belongs to the current user.
 */
export async function setJobStatusAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  const jobId = ((formData.get("jobId") as string | null) ?? "").trim();
  const status = ((formData.get("status") as string | null) ?? "").trim();
  if (!jobId) return { ok: false, error: "Missing job id." };

  if (status && !VALID_STATUSES.includes(status as JobStatusKey)) {
    return { ok: false, error: "Invalid status." };
  }

  // Authorize via the company's userId — Job has no direct userId.
  const job = await prisma.job.findFirst({
    where: { id: jobId, company: { userId: user.id } },
    select: { id: true },
  });
  if (!job) return { ok: false, error: "Not found." };

  await prisma.job.update({
    where: { id: job.id },
    data: {
      userStatus: status || null,
      userStatusAt: status ? new Date() : null,
    },
  });

  revalidatePath("/jobs");
  revalidatePath("/pipeline");
  revalidatePath("/");
  return { ok: true, message: status ? "Status saved." : "Status cleared." };
}

export type SummarizeResult =
  | { ok: true; summary: string }
  | { ok: false; error: string };

/**
 * Summarize a job description via the configured LLM and cache the result.
 * Subsequent calls return the cached summary without hitting the API.
 */
export async function summarizeJobAction(
  jobId: string,
): Promise<SummarizeResult> {
  const user = await requireUser();
  if (!jobId) return { ok: false, error: "Missing job id." };

  const job = await prisma.job.findFirst({
    where: { id: jobId, company: { userId: user.id } },
    select: {
      id: true,
      title: true,
      description: true,
      aiSummary: true,
    },
  });
  if (!job) return { ok: false, error: "Not found." };

  // Cached.
  if (job.aiSummary) return { ok: true, summary: job.aiSummary };

  if (!aiSummaryConfigured()) {
    return {
      ok: false,
      error: "AI summarizer not configured. Add an LLM key to .env.local.",
    };
  }
  if (!job.description) {
    return { ok: false, error: "No description to summarize." };
  }

  try {
    const summary = await summarizeJD(job.title, job.description);
    await prisma.job.update({
      where: { id: job.id },
      data: { aiSummary: summary },
    });
    revalidatePath("/jobs");
    revalidatePath("/pipeline");
    return { ok: true, summary };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

/** Update the current user's display name. Empty string clears it. */
export async function setDisplayNameAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  const displayName = ((formData.get("displayName") as string | null) ?? "")
    .trim()
    .slice(0, 60);

  await prisma.user.update({
    where: { id: user.id },
    data: { displayName: displayName || null },
  });

  revalidatePath("/", "layout");
  return { ok: true, message: "Display name updated." };
}

/**
 * Add a company to the *current user's* space by pasting any URL.
 * Auto-detects the ATS, stores the company, and triggers an initial sync.
 */
export async function addCompanyAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  const url = (formData.get("url") as string | null)?.trim() ?? "";
  const overrideName = (formData.get("name") as string | null)?.trim() ?? "";

  if (!url) {
    return { ok: false, error: "Please paste a career-page URL." };
  }

  let detected;
  try {
    detected = await detectAtsFromUrl(url);
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }

  // Per-user upsert: same ATS slug can be tracked by different users.
  const company = await prisma.company.upsert({
    where: {
      userId_atsType_atsSlug: {
        userId: user.id,
        atsType: detected.atsType,
        atsSlug: detected.atsSlug,
      },
    },
    create: {
      userId: user.id,
      name: overrideName || detected.guessedName,
      atsType: detected.atsType,
      atsSlug: detected.atsSlug,
      sourceUrl: detected.sourceUrl,
    },
    update: {
      name: overrideName || undefined,
      sourceUrl: detected.sourceUrl,
    },
  });

  // Initial sync (best-effort).
  try {
    const result = await syncCompany(company.id);
    revalidatePath("/jobs");
    revalidatePath("/admin");
    revalidatePath("/");
    return {
      ok: true,
      message: `Added ${company.name} (${detected.atsType}) — ${result.total} jobs synced.`,
    };
  } catch (e) {
    revalidatePath("/admin");
    return {
      ok: false,
      error: `Saved ${company.name}, but sync failed: ${
        e instanceof Error ? e.message : String(e)
      }`,
    };
  }
}

export async function syncCompanyAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  const id = (formData.get("id") as string | null) ?? "";
  if (!id) return { ok: false, error: "Missing company id." };

  // Authorize: company must belong to this user.
  const company = await prisma.company.findFirst({
    where: { id, userId: user.id },
    select: { id: true },
  });
  if (!company) return { ok: false, error: "Not found." };

  try {
    const result = await syncCompany(company.id);
    revalidatePath("/jobs");
    revalidatePath("/admin");
    revalidatePath("/");
    return {
      ok: true,
      message: `Synced — ${result.total} active, +${result.added} new, ${result.deactivated} closed.`,
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

export async function deleteCompanyAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const user = await requireUser();
  const id = (formData.get("id") as string | null) ?? "";
  if (!id) return { ok: false, error: "Missing company id." };

  // deleteMany scoped by userId — silently no-ops on a foreign id.
  const result = await prisma.company.deleteMany({
    where: { id, userId: user.id },
  });
  if (result.count === 0) return { ok: false, error: "Not found." };

  revalidatePath("/");
  revalidatePath("/admin");
  return { ok: true, message: "Removed." };
}
