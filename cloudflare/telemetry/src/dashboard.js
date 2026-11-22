// Server-rendered private dashboard. Plain HTML, no scripts.

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const KIND_LABEL = {
  ai_assistant: "AI assistant (live, for a person)",
  ai_search: "AI search crawler",
  ai_training: "AI training crawler",
  search: "Search engine",
  social: "Link preview",
  other_bot: "Other bot / script",
  suspect: "Disguised bot (suspect)",
  human: "Human",
};
const AI_KINDS = "('ai_assistant','ai_search','ai_training')";

export async function renderDashboard(env, days) {
  const since = `-${days} days`;
  const q = (sql, ...args) =>
    env.DB.prepare(sql)
      .bind(since, ...args)
      .all()
      .then((r) => r.results);

  const [byKind, aiAgents, aiPages, aiDaily, referrals, humanPages, suspects, recentAi, profileHits, lastRun, mentionTrend] = await Promise.all([
    q(`SELECT kind, COUNT(*) n FROM hits WHERE day >= date('now', ?) GROUP BY kind ORDER BY n DESC`),
    q(`SELECT agent, kind, COUNT(*) n, COUNT(DISTINCT path) pages, MAX(ts) last FROM hits
         WHERE day >= date('now', ?) AND kind IN ${AI_KINDS} GROUP BY agent, kind ORDER BY n DESC`),
    q(`SELECT path, COUNT(*) n, COUNT(DISTINCT agent) agents FROM hits
         WHERE day >= date('now', ?) AND kind IN ${AI_KINDS} GROUP BY path ORDER BY n DESC LIMIT 25`),
    q(`SELECT day, SUM(kind='ai_assistant') a, SUM(kind='ai_search') s, SUM(kind='ai_training') t,
                SUM(kind='human') h FROM hits WHERE day >= date('now', ?) GROUP BY day ORDER BY day`),
    q(`SELECT ref_source, path, COUNT(*) n FROM hits WHERE day >= date('now', ?) AND ref_source IS NOT NULL
         GROUP BY ref_source, path ORDER BY n DESC LIMIT 30`),
    q(`SELECT path, COUNT(*) n, COUNT(DISTINCT visitor) visitors FROM hits
         WHERE day >= date('now', ?) AND kind='human' GROUP BY path ORDER BY n DESC LIMIT 20`),
    q(`SELECT as_org, agent, COUNT(*) n FROM hits WHERE day >= date('now', ?) AND kind='suspect'
         GROUP BY as_org, agent ORDER BY n DESC LIMIT 15`),
    q(`SELECT ts, agent, kind, path, country, cache FROM hits WHERE day >= date('now', ?)
         AND kind IN ${AI_KINDS} ORDER BY id DESC LIMIT 40`),
    q(`SELECT path, agent, COUNT(*) n, MAX(ts) last FROM hits WHERE day >= date('now', ?)
         AND (path IN ('/ai.md','/ai/','/llms.txt','/llms-full.txt') OR path LIKE '%.md') AND kind != 'human'
         GROUP BY path, agent ORDER BY n DESC LIMIT 30`),
    env.DB.prepare(`SELECT * FROM mentions WHERE run_id = (SELECT MAX(run_id) FROM mentions) ORDER BY question, provider`)
      .all()
      .then((r) => r.results),
    q(`SELECT day, provider, SUM(mentioned) m, SUM(linked_site) l, COUNT(*) n FROM mentions
         WHERE day >= date('now', ?) GROUP BY day, provider ORDER BY day`),
  ]);

  const total = (kinds) => byKind.filter((r) => kinds.includes(r.kind)).reduce((a, r) => a + r.n, 0);
  const max = Math.max(1, ...aiDaily.map((d) => d.a + d.s + d.t));

  const providers = [...new Set(lastRun.map((r) => r.provider))];
  const questions = [...new Set(lastRun.map((r) => r.question))];
  const cell = (question, provider) => {
    const r = lastRun.find((x) => x.question === question && x.provider === provider);
    if (!r) return "<td>–</td>";
    if (r.error) return `<td class="err" title="${esc(r.error)}">error</td>`;
    const label = r.mentioned ? (r.linked_site ? "named + linked" : "named") : "not named";
    return `<td class="${r.mentioned ? "yes" : "no"}"><details><summary>${label}</summary><div class="ans">${esc(r.answer).slice(
      0,
      2500
    )}</div><div class="cites">${JSON.parse(r.citations || "[]")
      .slice(0, 12)
      .map((c) => `<a href="${esc(c)}">${esc(c.replace(/^https?:\/\//, "").slice(0, 60))}</a>`)
      .join("<br>")}</div></details></td>`;
  };

  const table = (rows, cols) =>
    rows.length
      ? `<table><tr>${cols.map(([h]) => `<th>${h}</th>`).join("")}</tr>${rows
          .map((r) => `<tr>${cols.map(([, f]) => `<td>${f(r)}</td>`).join("")}</tr>`)
          .join("")}</table>`
      : `<p class="empty">Nothing yet.</p>`;

  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>arafatkatze.com telemetry</title>
<style>
body{font:14px/1.45 -apple-system,system-ui,sans-serif;margin:0;background:#0f1115;color:#e6e6e6}
main{max-width:1100px;margin:auto;padding:24px}
h1{font-size:22px;margin:0 0 4px}h2{font-size:16px;margin:32px 0 8px;color:#9ecbff}
.sub{color:#999;margin-bottom:16px}a{color:#9ecbff}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px}
.card{background:#181b22;border:1px solid #262a33;border-radius:8px;padding:12px}
.card b{display:block;font-size:24px}.card span{color:#999;font-size:12px}
table{border-collapse:collapse;width:100%;background:#181b22;border-radius:8px;overflow:hidden}
th,td{text-align:left;padding:6px 8px;border-bottom:1px solid #262a33;vertical-align:top}
th{color:#999;font-weight:500;font-size:12px}
.bars{display:flex;align-items:flex-end;gap:2px;height:120px;background:#181b22;padding:8px;border-radius:8px}
.bar{flex:1;display:flex;flex-direction:column-reverse;min-width:3px}
.bar i{display:block}.a{background:#f2c94c}.s{background:#56ccf2}.t{background:#6c7a89}
.legend span{margin-right:12px;font-size:12px}.legend i{display:inline-block;width:10px;height:10px;margin-right:4px}
td.yes{background:#143d2b}td.no{background:#3a1d1d}td.err{background:#3a331d}
details summary{cursor:pointer}.ans{white-space:pre-wrap;max-height:300px;overflow:auto;font-size:12px;color:#ccc;margin:6px 0}
.cites{font-size:11px}.empty{color:#777}
nav a{margin-right:10px}
</style></head><body><main>
<h1>arafatkatze.com telemetry</h1>
<div class="sub">Last ${days} days · <nav style="display:inline"><a href="?days=7">7d</a><a href="?days=30">30d</a><a href="?days=90">90d</a><a href="/_stats/data.json?days=${days}">raw JSON</a></nav></div>

<div class="cards">
  <div class="card"><b>${total(["ai_assistant"])}</b><span>AI assistant fetches (a person asked an AI about this site)</span></div>
  <div class="card"><b>${total(["ai_search"])}</b><span>AI search crawls</span></div>
  <div class="card"><b>${total(["ai_training"])}</b><span>AI training crawls</span></div>
  <div class="card"><b>${referrals.reduce((a, r) => a + r.n, 0)}</b><span>Visits from AI answers (ChatGPT, Perplexity…)</span></div>
  <div class="card"><b>${total(["human"])}</b><span>Human page views</span></div>
  <div class="card"><b>${total(["suspect"])}</b><span>Disguised bots</span></div>
</div>

<h2>AI bot visits per day</h2>
<div class="bars">${aiDaily
    .map(
      (d) =>
        `<div class="bar" title="${d.day}: ${d.a} assistant, ${d.s} search, ${d.t} training"><i class="t" style="height:${
          (d.t / max) * 100
        }%"></i><i class="s" style="height:${(d.s / max) * 100}%"></i><i class="a" style="height:${(d.a / max) * 100}%"></i></div>`
    )
    .join("")}</div>
<div class="legend"><span><i class="a"></i>assistant</span><span><i class="s"></i>search</span><span><i class="t"></i>training</span></div>

<h2>Do AI assistants mention you? (latest daily run${lastRun[0] ? `, ${esc(lastRun[0].run_id.slice(0, 16).replace("T", " "))} UTC` : ""})</h2>
${
  questions.length
    ? `<table><tr><th>Question</th>${providers.map((p) => `<th>${esc(p)}</th>`).join("")}</tr>${questions
        .map((qq) => `<tr><td>${esc(qq)}</td>${providers.map((p) => cell(qq, p)).join("")}</tr>`)
        .join("")}</table>`
    : `<p class="empty">No monitor runs yet. The first runs on the next daily schedule.</p>`
}

<h2>Mentions over time</h2>
${table(mentionTrend, [
  ["Day", (r) => r.day],
  ["Provider", (r) => esc(r.provider)],
  ["Named", (r) => `${r.m}/${r.n}`],
  ["Linked your site", (r) => `${r.l}/${r.n}`],
])}

<h2>Which AI bots visit</h2>
${table(aiAgents, [
  ["Bot", (r) => esc(r.agent)],
  ["Type", (r) => KIND_LABEL[r.kind]],
  ["Requests", (r) => r.n],
  ["Distinct pages", (r) => r.pages],
  ["Last seen (UTC)", (r) => esc(r.last.slice(0, 16).replace("T", " "))],
])}

<h2>AI-readable pages (/ai.md, /llms.txt, .md copies)</h2>
${table(profileHits, [
  ["Path", (r) => esc(r.path)],
  ["Bot", (r) => esc(r.agent)],
  ["Requests", (r) => r.n],
  ["Last", (r) => esc(r.last.slice(0, 16).replace("T", " "))],
])}

<h2>Pages AI bots read most</h2>
${table(aiPages, [
  ["Path", (r) => `<a href="${esc(r.path)}">${esc(r.path)}</a>`],
  ["Requests", (r) => r.n],
  ["Different bots", (r) => r.agents],
])}

<h2>People arriving from AI answers</h2>
${table(referrals, [
  ["From", (r) => esc(r.ref_source)],
  ["Landed on", (r) => esc(r.path)],
  ["Visits", (r) => r.n],
])}

<h2>Human page views</h2>
<p class="empty">Visitor-days: a visitor counts once per day they visit. The hash changes daily, so no one is tracked across days.</p>
${table(humanPages, [
  ["Path", (r) => esc(r.path)],
  ["Views", (r) => r.n],
  ["Visitor-days", (r) => r.visitors],
])}

<h2>Disguised bots (browser user agent from a cloud network, or very old Chrome)</h2>
${table(suspects, [
  ["Network", (r) => esc(r.as_org || "?")],
  ["Claimed", (r) => esc(r.agent)],
  ["Requests", (r) => r.n],
])}

<h2>Latest AI bot requests</h2>
${table(recentAi, [
  ["Time (UTC)", (r) => esc(r.ts.slice(5, 16).replace("T", " "))],
  ["Bot", (r) => esc(r.agent)],
  ["Path", (r) => esc(r.path)],
  ["Country", (r) => esc(r.country)],
  ["Cache", (r) => esc(r.cache)],
])}

<h2>All traffic by type</h2>
${table(byKind, [
  ["Type", (r) => KIND_LABEL[r.kind] || esc(r.kind)],
  ["Requests", (r) => r.n],
])}
</main></body></html>`;
}
