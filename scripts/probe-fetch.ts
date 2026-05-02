// Diagnose why server-side fetch fails when curl succeeds.
// Run: npx tsx scripts/probe-fetch.ts

async function probe(url: string) {
  console.log(`\n--- ${url}`);
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    console.log("status:", res.status);
    const text = await res.text();
    console.log("body length:", text.length);
  } catch (err) {
    console.log("ERROR:", err instanceof Error ? err.message : String(err));
    if (err instanceof Error && err.cause) {
      console.log("CAUSE:", err.cause);
    }
  }
}

async function main() {
  await probe(
    "https://boards-api.greenhouse.io/v1/boards/anthropic/jobs?content=true",
  );
  await probe("https://api.lever.co/v0/postings/spotify?mode=json");
  await probe("https://api.ashbyhq.com/posting-api/job-board/openai");
}
main();
