// Summarize a job description into 2–3 sentences via the configured LLM.
// Uses the same provider auto-detection as ai-search.ts.

const TIMEOUT_MS = 10_000;

const SYSTEM_PROMPT = `You write tight 2-sentence summaries of job descriptions for a job-tracking app.

Rules:
- Maximum 2 sentences. No more.
- Sentence 1: what the role does (core responsibilities).
- Sentence 2: key requirements (skills, experience, location/remote if notable).
- Plain prose. No bullet lists. No markdown. No preamble. No "this role…" filler.
- If the description is too short to summarize, return it verbatim (trimmed to 2 sentences).`;

type Provider = "gemini" | "anthropic" | "groq" | "openai" | null;

function pickProvider(): Provider {
  if (process.env.GEMINI_API_KEY) return "gemini";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.GROQ_API_KEY) return "groq";
  if (process.env.OPENAI_API_KEY) return "openai";
  return null;
}

export function aiSummaryConfigured(): boolean {
  return pickProvider() !== null;
}

export async function summarizeJD(
  title: string,
  description: string,
): Promise<string> {
  const provider = pickProvider();
  if (!provider) throw new Error("No LLM provider configured.");

  const userText = `Title: ${title}\n\nDescription:\n${description.slice(0, 4000)}`;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    switch (provider) {
      case "gemini":
        return await gemini(userText, ctrl.signal);
      case "anthropic":
        return await anthropic(userText, ctrl.signal);
      case "groq":
        return await openaiCompat(
          process.env.GROQ_API_KEY!,
          process.env.GROQ_BASE_URL ?? "https://api.groq.com/openai/v1",
          process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile",
          userText,
          ctrl.signal,
        );
      case "openai":
        return await openaiCompat(
          process.env.OPENAI_API_KEY!,
          process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1",
          process.env.OPENAI_MODEL ?? "gpt-4o-mini",
          userText,
          ctrl.signal,
        );
    }
  } finally {
    clearTimeout(timer);
  }
}

async function gemini(userText: string, signal: AbortSignal): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY!;
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
      contents: [{ role: "user", parts: [{ text: userText }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 220 },
    }),
  });
  if (!res.ok)
    throw new Error(`Gemini ${res.status}: ${await safeText(res)}`);
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) throw new Error("Empty Gemini response");
  return text;
}

async function anthropic(
  userText: string,
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
      max_tokens: 220,
      temperature: 0.3,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userText }],
    }),
  });
  if (!res.ok)
    throw new Error(`Anthropic ${res.status}: ${await safeText(res)}`);
  const data = (await res.json()) as {
    content?: { type: string; text?: string }[];
  };
  const text = data.content?.find((p) => p.type === "text")?.text?.trim();
  if (!text) throw new Error("Empty Anthropic response");
  return text;
}

async function openaiCompat(
  apiKey: string,
  baseUrl: string,
  model: string,
  userText: string,
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
        { role: "user", content: userText },
      ],
      temperature: 0.3,
      max_tokens: 220,
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await safeText(res)}`);
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content?.trim();
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
