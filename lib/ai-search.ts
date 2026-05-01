// AI-powered search: turn a natural-language query into structured filters.
//
// Supports several LLM providers — auto-detected by which env var is set:
//   - GEMINI_API_KEY      → Google Gemini (free tier, no billing required)
//   - ANTHROPIC_API_KEY   → Anthropic Claude
//   - GROQ_API_KEY        → Groq (OpenAI-compatible)
//   - OPENAI_API_KEY      → OpenAI / OpenAI-compatible (override base URL via OPENAI_BASE_URL)
// If none are set or the call fails, falls back to keyword-only search.

export type ParsedSearch = {
  titleKeywords: string[];
  locationKeywords: string[];
  departmentKeywords: string[];
  remoteOnly: boolean;
  freeText: string;
  /** True if an LLM successfully parsed; false if we fell back to keywords. */
  usedAI: boolean;
};

const TIMEOUT_MS = 8_000;

const SYSTEM_PROMPT = `You parse natural-language job-search queries into structured filters.
Return ONLY a JSON object — no prose, no markdown — with these keys:
{
  "title_keywords":      string[],   // job-title words (e.g. "frontend", "ML engineer", "designer", "PM")
  "location_keywords":   string[],   // place names (cities, countries, regions). Expand abbreviations: "SF" -> "San Francisco", "NYC" -> "New York", "EU" -> "Europe".
  "department_keywords": string[],   // function/team (e.g. "engineering", "marketing", "design")
  "remote_only":         boolean,    // true ONLY if the query explicitly wants remote roles
  "free_text":           string      // residual that doesn't fit elsewhere (skills, seniority, etc.)
}
If a field has no value, return [] or "" or false. Always return valid JSON.`;

type Provider = "gemini" | "anthropic" | "groq" | "openai" | null;

function pickProvider(): Provider {
  if (process.env.GEMINI_API_KEY) return "gemini";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.GROQ_API_KEY) return "groq";
  if (process.env.OPENAI_API_KEY) return "openai";
  return null;
}

export async function parseSearchQuery(
  rawQuery: string,
): Promise<ParsedSearch> {
  const trimmed = rawQuery.trim();
  if (!trimmed) return empty();

  const provider = pickProvider();
  if (!provider) return keywordFallback(trimmed);

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const json = await callProvider(provider, trimmed, ctrl.signal);
    const parsed = JSON.parse(json) as Partial<{
      title_keywords: string[];
      location_keywords: string[];
      department_keywords: string[];
      remote_only: boolean;
      free_text: string;
    }>;
    return {
      titleKeywords: cleanList(parsed.title_keywords),
      locationKeywords: cleanList(parsed.location_keywords),
      departmentKeywords: cleanList(parsed.department_keywords),
      remoteOnly: Boolean(parsed.remote_only),
      freeText: typeof parsed.free_text === "string" ? parsed.free_text : "",
      usedAI: true,
    };
  } catch (err) {
    console.warn(`[ai-search] ${provider} parse failed, falling back:`, err);
    return keywordFallback(trimmed);
  } finally {
    clearTimeout(timer);
  }
}

// ---------- Provider calls ----------

async function callProvider(
  provider: Exclude<Provider, null>,
  userQuery: string,
  signal: AbortSignal,
): Promise<string> {
  switch (provider) {
    case "gemini":
      return callGemini(userQuery, signal);
    case "anthropic":
      return callAnthropic(userQuery, signal);
    case "groq":
      return callOpenAICompatible(
        process.env.GROQ_API_KEY!,
        process.env.GROQ_BASE_URL ?? "https://api.groq.com/openai/v1",
        process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile",
        userQuery,
        signal,
      );
    case "openai":
      return callOpenAICompatible(
        process.env.OPENAI_API_KEY!,
        process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1",
        process.env.OPENAI_MODEL ?? "gpt-4o-mini",
        userQuery,
        signal,
      );
  }
}

async function callGemini(
  userQuery: string,
  signal: AbortSignal,
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY!;
  // Default to gemini-2.5-flash-lite — currently on the free tier without
  // billing setup. Override via GEMINI_MODEL if you have a paid account.
  const model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash-lite";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model,
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const res = await fetch(url, {
    method: "POST",
    signal,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: "user", parts: [{ text: userQuery }] }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0,
        maxOutputTokens: 400,
      },
    }),
  });
  if (!res.ok) throw new Error(`Gemini HTTP ${res.status}: ${await safeText(res)}`);
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned empty content");
  return text;
}

async function callAnthropic(
  userQuery: string,
  signal: AbortSignal,
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY!;
  const model = process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5";

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    signal,
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 400,
      temperature: 0,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userQuery }],
    }),
  });
  if (!res.ok)
    throw new Error(`Anthropic HTTP ${res.status}: ${await safeText(res)}`);
  const data = (await res.json()) as {
    content?: { type: string; text?: string }[];
  };
  const text = data.content?.find((p) => p.type === "text")?.text;
  if (!text) throw new Error("Anthropic returned empty content");
  return text;
}

async function callOpenAICompatible(
  apiKey: string,
  baseUrl: string,
  model: string,
  userQuery: string,
  signal: AbortSignal,
): Promise<string> {
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    signal,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userQuery },
      ],
      response_format: { type: "json_object" },
      temperature: 0,
      max_tokens: 400,
    }),
  });
  if (!res.ok)
    throw new Error(`HTTP ${res.status}: ${await safeText(res)}`);
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty response");
  return content;
}

async function safeText(res: Response): Promise<string> {
  try {
    return (await res.text()).slice(0, 200);
  } catch {
    return "";
  }
}

// ---------- Fallbacks & helpers ----------

function empty(): ParsedSearch {
  return {
    titleKeywords: [],
    locationKeywords: [],
    departmentKeywords: [],
    remoteOnly: false,
    freeText: "",
    usedAI: false,
  };
}

function keywordFallback(q: string): ParsedSearch {
  const remoteOnly = /\bremote\b/i.test(q);
  return {
    ...empty(),
    remoteOnly,
    freeText: q.replace(/\bremote\b/gi, " ").replace(/\s+/g, " ").trim(),
  };
}

function cleanList(xs: unknown): string[] {
  if (!Array.isArray(xs)) return [];
  return xs
    .filter((x): x is string => typeof x === "string")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .slice(0, 8); // cap so adversarial inputs can't blow up the WHERE clause
}

/**
 * Build a Prisma `where` clause from a parsed query, scoped to a user's
 * companies. Uses ANDs of ORs: each filter category narrows; within a
 * category, any keyword match counts.
 */
export function buildSearchWhere(parsed: ParsedSearch, userId: string) {
  const and: Record<string, unknown>[] = [];

  if (parsed.titleKeywords.length > 0) {
    and.push({
      OR: parsed.titleKeywords.map((k) => ({ title: { contains: k } })),
    });
  }
  if (parsed.locationKeywords.length > 0) {
    and.push({
      OR: parsed.locationKeywords.map((k) => ({ location: { contains: k } })),
    });
  }
  if (parsed.departmentKeywords.length > 0) {
    and.push({
      OR: parsed.departmentKeywords.map((k) => ({
        department: { contains: k },
      })),
    });
  }
  if (parsed.remoteOnly) {
    and.push({ remote: true });
  }
  if (parsed.freeText.length > 0) {
    and.push({
      OR: [
        { title: { contains: parsed.freeText } },
        { description: { contains: parsed.freeText } },
        { location: { contains: parsed.freeText } },
        { department: { contains: parsed.freeText } },
      ],
    });
  }

  return {
    isActive: true,
    company: { userId },
    ...(and.length ? { AND: and } : {}),
  };
}
