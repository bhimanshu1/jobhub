// Verifies parseSearchQuery + buildSearchWhere on real-ish queries.
// With GROQ_API_KEY: hits the live LLM. Without: tests keyword fallback.
//
// Run: npx tsx scripts/ai-search-smoke.ts

import { config } from "dotenv";
// Match Next.js precedence: .env.local overrides .env in dev.
config({ path: [".env.local", ".env"] });
import { parseSearchQuery, buildSearchWhere } from "../lib/ai-search";

async function main() {
  const queries = [
    "remote frontend jobs in Europe with React",
    "ML engineer in SF",
    "senior product designer",
    "anything fun in NYC",
  ];

  console.log(
    "GROQ_API_KEY:",
    process.env.GROQ_API_KEY ? "set (real AI)" : "absent (keyword fallback)",
  );
  console.log();

  for (const q of queries) {
    const parsed = await parseSearchQuery(q);
    const where = buildSearchWhere(parsed, "USER_ID_PLACEHOLDER");
    console.log(`> ${q}`);
    console.log("  parsed:", parsed);
    console.log("  where keys:", Object.keys(where));
    console.log();
    // Free-tier providers (Cerebras llama3.1-8b, Gemini Flash) are sensitive
    // to burst RPM — space requests out so the smoke doesn't 429 itself.
    await new Promise((r) => setTimeout(r, 4_000));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
