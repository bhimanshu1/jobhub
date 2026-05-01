import type { AtsType, FetchedJob } from "./types";
import { fetchGreenhouseJobs } from "./greenhouse";
import { fetchLeverJobs } from "./lever";
import { fetchAshbyJobs } from "./ashby";

export { detectAtsFromUrl } from "./detect";
export type { AtsType, DetectedSource, FetchedJob } from "./types";

export async function fetchJobsFor(
  atsType: AtsType,
  slug: string,
): Promise<FetchedJob[]> {
  switch (atsType) {
    case "greenhouse":
      return fetchGreenhouseJobs(slug);
    case "lever":
      return fetchLeverJobs(slug);
    case "ashby":
      return fetchAshbyJobs(slug);
    default: {
      const _exhaustive: never = atsType;
      throw new Error(`Unsupported ATS: ${String(_exhaustive)}`);
    }
  }
}
