// Common types shared across ATS adapters.

export type AtsType = "greenhouse" | "lever" | "ashby";

export type DetectedSource = {
  atsType: AtsType;
  atsSlug: string;
  /** Human-friendly company name guessed from the URL/page (caller may overwrite). */
  guessedName: string;
  /** Original URL the user pasted; kept for reference. */
  sourceUrl: string;
};

export type FetchedJob = {
  externalId: string;
  title: string;
  location: string | null;
  department: string | null;
  employmentType: string | null;
  remote: boolean;
  url: string;
  description: string | null;
  postedAt: Date | null;
};
