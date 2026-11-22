#!/usr/bin/env node
// Ask Claude, ChatGPT, Perplexity and Gemini (each with web search) whether
// they know Ara, print a summary, and save the answers to the telemetry
// database so they show on https://arafatkatze.com/_stats.
//
// Run on your Mac, with keys from 1Password (never sent to Cloudflare):
//   secrets-run --provider anthropic --provider openai-default --provider gemini -- npm run check
//
// Options:
//   --providers anthropic,openai   only these providers
//   --questions 2                  only the first N questions (cheaper test)
//   --dry-run                      list what would be asked; no API calls
//   --no-save                      print only; don't write to the database

import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { runMonitor, QUESTIONS } from "./monitor.js";

const args = process.argv.slice(2);
const opt = (name) => {
  const i = args.indexOf(name);
  return i === -1 ? null : args[i + 1];
};
const flag = (name) => args.includes(name);

const KEY_VARS = {
  ANTHROPIC_API_KEY: ["ANTHROPIC_API_KEY", "CODEX_LLM_API_ANTHROPIC"],
  OPENAI_API_KEY: ["OPENAI_API_KEY", "CODEX_LLM_API_OPENAI_DEFAULT"],
  GEMINI_API_KEY: ["GEMINI_API_KEY", "CODEX_LLM_API_GEMINI"],
  PERPLEXITY_API_KEY: ["PERPLEXITY_API_KEY"],
};
const env = {
  ANTHROPIC_MODEL: process.env.ANTHROPIC_MODEL || "claude-opus-5-5",
  OPENAI_MODEL: process.env.OPENAI_MODEL || "gpt-5",
  PERPLEXITY_MODEL: process.env.PERPLEXITY_MODEL || "sonar-pro",
  GEMINI_MODEL: process.env.GEMINI_MODEL || "gemini-2.5-pro",
};
for (const [name, sources] of Object.entries(KEY_VARS)) {
  const found = sources.map((v) => process.env[v]).find(Boolean);
  if (found) env[name] = found;
}

const providers = opt("--providers")?.split(",");
const questions = QUESTIONS.slice(0, Number(opt("--questions")) || QUESTIONS.length);
const enabled = Object.entries({
  anthropic: "ANTHROPIC_API_KEY",
  openai: "OPENAI_API_KEY",
  perplexity: "PERPLEXITY_API_KEY",
  gemini: "GEMINI_API_KEY",
})
  .filter(([p, key]) => env[key] && (!providers || providers.includes(p)))
  .map(([p]) => p);

console.log(`Providers with keys: ${enabled.join(", ") || "none"}`);
console.log(`Questions: ${questions.length} (${enabled.length * questions.length} calls)\n`);
if (flag("--dry-run")) {
  questions.forEach((q, i) => console.log(`${i + 1}. ${q}`));
  process.exit(0);
}
if (!enabled.length) {
  console.error("No provider keys found. Run it through secrets-run (see the top of this file).");
  process.exit(1);
}

const { runId, day, results } = await runMonitor(env, { questions, providers: enabled });

// Summary: one row per question, one column per provider.
const mark = (r) => (!r ? "-" : r.error ? "error" : r.mentioned ? (r.linked ? "named+link" : "named") : "no");
console.log(["", ...enabled].map((s) => s.padEnd(12)).join(""));
questions.forEach((q, i) => {
  const row = enabled.map((p) => mark(results.find((r) => r.provider === p && r.question === q)).padEnd(12));
  console.log(`Q${String(i + 1).padEnd(11)}${row.join("")}`);
});
for (const r of results.filter((r) => r.error)) console.log(`\n${r.provider} error: ${r.error}`);
const named = results.filter((r) => r.mentioned).length;
console.log(`\nNamed in ${named} of ${results.length} answers.`);

if (flag("--no-save")) process.exit(0);

// Save through wrangler (already signed in). The child gets no API keys.
const q = (v) => (v === null || v === undefined ? "NULL" : typeof v === "number" ? String(v) : `'${String(v).replace(/'/g, "''")}'`);
const sql = results
  .map(
    (r) =>
      `INSERT INTO mentions (ts, day, run_id, provider, model, question, mentioned, linked_site, citations, answer, error) VALUES (${[
        new Date().toISOString(),
        day,
        runId,
        r.provider,
        r.model,
        r.question,
        r.mentioned,
        r.linked,
        JSON.stringify(r.citations),
        r.text,
        r.error || null,
      ]
        .map(q)
        .join(", ")});`
  )
  .join("\n");
const dir = mkdtempSync(join(tmpdir(), "mentions-"));
const file = join(dir, "mentions.sql");
writeFileSync(file, sql);
const childEnv = { ...process.env };
for (const sources of Object.values(KEY_VARS)) for (const v of sources) delete childEnv[v];
const res = spawnSync("npx", ["wrangler", "d1", "execute", "ara-site-telemetry", "--remote", "-y", `--file=${file}`], {
  cwd: join(dirname(fileURLToPath(import.meta.url)), ".."),
  env: childEnv,
  encoding: "utf8",
});
rmSync(dir, { recursive: true, force: true });
if (res.status !== 0) {
  console.error("Saving to the database failed:\n" + (res.stderr || res.stdout).slice(-800));
  process.exit(1);
}
console.log("Saved. See https://arafatkatze.com/_stats");
