// Daily check: do AI assistants mention Ara when asked the questions a
// recruiter, founder or conference organizer would ask?
//
// Each provider runs with live web search, like the consumer products do.
// A provider is skipped when its API key secret is not set.

import Anthropic from "@anthropic-ai/sdk";

export const QUESTIONS = [
  // Direct: does the assistant know who Ara is, and get it right?
  "Who is Ara Khan, the AI engineer at Cline?",
  "Who is Arafat Khan (@arafatkatze on X and GitHub)?",
  // Discovery: does Ara come up when nobody names him?
  "Which engineers have published practical guides on hill climbing AI coding agents on Terminal-Bench?",
  "Who has written about recursive self-improvement for AI coding agents, and what results did they get?",
  "I'm organizing an AI engineering conference. Who are good speakers on evaluating AI coding agents?",
  "Who are notable engineers building open-source AI coding agents like Cline?",
  "Who has written about the real cost of self-hosting LLM inference versus using APIs, with numbers?",
  "I'm hiring a founding engineer with deep experience in AI agent evals. Who should I look at?",
];

const NAME_RE = /\bara\s+khan\b|\barafat\s+khan\b|arafatkatze/i;
const SITE_RE = /arafatkatze\.com/i;

const SYSTEM =
  "Answer the user's question as a helpful assistant would. Search the web when it helps. Name specific people where relevant and cite your sources.";

export async function runMonitor(env, { questions = QUESTIONS, providers } = {}) {
  const runId = new Date().toISOString();
  const day = runId.slice(0, 10);
  const all = {
    anthropic: env.ANTHROPIC_API_KEY && askAnthropic,
    openai: env.OPENAI_API_KEY && askOpenAI,
    perplexity: env.PERPLEXITY_API_KEY && askPerplexity,
    gemini: env.GEMINI_API_KEY && askGemini,
  };
  const chosen = Object.entries(all).filter(
    ([name, fn]) => fn && (!providers || providers.includes(name)),
  );

  const jobs = [];
  for (const [provider, fn] of chosen) {
    for (const question of questions) {
      jobs.push(
        fn(env, question)
          .then((r) => ({ provider, question, ...r }))
          .catch((e) => ({ provider, question, model: null, text: "", citations: [], error: String(e?.message || e).slice(0, 500) })),
      );
    }
  }
  const results = await Promise.all(jobs);

  const stmt = env.DB.prepare(
    `INSERT INTO mentions (ts, day, run_id, provider, model, question, mentioned, linked_site, citations, answer, error)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  await env.DB.batch(
    results.map((r) => {
      const cites = [...new Set(r.citations || [])].slice(0, 40);
      const mentioned = NAME_RE.test(r.text || "") ? 1 : 0;
      const linked = SITE_RE.test(r.text || "") || cites.some((c) => SITE_RE.test(c)) ? 1 : 0;
      return stmt.bind(
        new Date().toISOString(), day, runId, r.provider, r.model, r.question,
        mentioned, linked, JSON.stringify(cites), (r.text || "").slice(0, 6000), r.error || null,
      );
    }),
  );
  return {
    runId,
    asked: results.length,
    mentioned: results.filter((r) => NAME_RE.test(r.text || "")).length,
    errors: results.filter((r) => r.error).map((r) => `${r.provider}: ${r.error}`),
  };
}

// Claude with the web search server tool.
async function askAnthropic(env, question) {
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  const model = env.ANTHROPIC_MODEL || "claude-opus-5-5";
  const messages = [{ role: "user", content: question }];
  const text = [];
  const citations = [];
  // Server tools can pause a long turn; resume it a few times.
  for (let i = 0; i < 4; i++) {
    const response = await client.beta.messages.create({
      model,
      max_tokens: 8000,
      system: SYSTEM,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium" },
      tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 5 }],
      messages,
    });
    for (const block of response.content) {
      if (block.type === "text") {
        text.push(block.text);
        for (const c of block.citations || []) if (c.url) citations.push(c.url);
      } else if (block.type === "web_search_tool_result" && Array.isArray(block.content)) {
        for (const r of block.content) if (r.url) citations.push(r.url);
      }
    }
    if (response.stop_reason === "refusal") break;
    if (response.stop_reason !== "pause_turn") break;
    messages.push({ role: "assistant", content: response.content });
  }
  return { model, text: text.join(""), citations };
}

// OpenAI Responses API with the web search tool.
async function askOpenAI(env, question) {
  const model = env.OPENAI_MODEL || "gpt-5";
  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { authorization: `Bearer ${env.OPENAI_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({ model, instructions: SYSTEM, input: question, tools: [{ type: "web_search" }] }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${JSON.stringify(data.error || data).slice(0, 300)}`);
  const text = [];
  const citations = [];
  for (const item of data.output || []) {
    if (item.type !== "message") continue;
    for (const part of item.content || []) {
      if (part.type === "output_text") {
        text.push(part.text);
        for (const a of part.annotations || []) if (a.url) citations.push(a.url);
      }
    }
  }
  return { model: data.model || model, text: text.join("\n"), citations };
}

// Perplexity Sonar searches the web on every request.
async function askPerplexity(env, question) {
  const model = env.PERPLEXITY_MODEL || "sonar-pro";
  const res = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: { authorization: `Bearer ${env.PERPLEXITY_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({ model, messages: [{ role: "system", content: SYSTEM }, { role: "user", content: question }] }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Perplexity ${res.status}: ${JSON.stringify(data.error || data).slice(0, 300)}`);
  const citations = [
    ...(data.citations || []),
    ...((data.search_results || []).map((r) => r.url)),
  ].filter(Boolean);
  return { model: data.model || model, text: data.choices?.[0]?.message?.content || "", citations };
}

// Gemini with Google Search grounding.
async function askGemini(env, question) {
  const model = env.GEMINI_MODEL || "gemini-2.5-pro";
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: { "x-goog-api-key": env.GEMINI_API_KEY, "content-type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM }] },
        contents: [{ role: "user", parts: [{ text: question }] }],
        tools: [{ google_search: {} }],
      }),
    },
  );
  const data = await res.json();
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${JSON.stringify(data.error || data).slice(0, 300)}`);
  const cand = data.candidates?.[0] || {};
  const text = (cand.content?.parts || []).map((p) => p.text || "").join("");
  // Grounding links are redirect URLs; the title holds the real domain.
  const citations = (cand.groundingMetadata?.groundingChunks || [])
    .map((c) => c.web && (c.web.title?.includes(".") ? `https://${c.web.title}` : c.web.uri))
    .filter(Boolean);
  return { model, text, citations };
}
