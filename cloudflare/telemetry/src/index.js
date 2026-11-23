// Runs in front of arafatkatze.com (GitHub Pages behind Cloudflare).
//
// fetch:      passes every request straight through (Cloudflare's cache still
//             applies), then logs it to D1 after the response is sent, so
//             visitors never wait on logging.
// markdown:   requests with Accept: text/markdown get the page's .md copy.
// /_stats:    private dashboard (needs ?key=STATS_KEY once; sets a cookie).
// scheduled:  daily log retention. (The AI-mention check runs locally:
//             scripts/check-mentions.mjs.)

import { classify, aiReferrer } from "./classify.js";
import { renderDashboard } from "./dashboard.js";

const ASSET = /\.(css|js|mjs|map|png|jpe?g|gif|webp|avif|svg|ico|woff2?|ttf|otf|eot|mp4|webm|mp3|wav|ogg|ply|glb|gltf|wasm|zip|csv)$/i;
const RETENTION_DAYS = 400;

// Old or guessed URLs that AI assistants have asked for (seen in the logs).
const REDIRECTS = {
  "/blog/ruby-tensorflow/": "/projects/rubyTensorflow/",
  "/blog/ruby-tensorflow": "/projects/rubyTensorflow/",
  // Images moved to Cloudinary in cebc8e2d; crawlers still ask for the old paths.
  "/nemotron-inference/assets/intelligence-speed-solar-best-run.png":
    "https://res.cloudinary.com/dozxd4znm/image/upload/q_auto,f_auto/v1794860188/site/nemotron-inference/intelligence-speed-solar-best-run.png",
  "/nemotron-inference/assets/cline32-poster.jpg":
    "https://res.cloudinary.com/dozxd4znm/image/upload/q_auto,f_auto/v1794860187/site/nemotron-inference/cline32-poster.jpg",
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === "/_stats" || url.pathname.startsWith("/_stats/")) {
      return stats(request, env, ctx, url);
    }

    const to = REDIRECTS[url.pathname];
    if (to) {
      const response = Response.redirect(new URL(to, url).toString(), 301);
      ctx.waitUntil(log(request, response, env, url).catch(() => {}));
      return response;
    }

    const md = await markdownFor(request, url);
    if (md) {
      ctx.waitUntil(log(request, md.response, env, url, md.path).catch(() => {}));
      return md.response;
    }

    const response = await fetch(request);
    ctx.waitUntil(log(request, response, env, url).catch(() => {}));
    return response;
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(
      (async () => {
        await env.DB.prepare(`DELETE FROM hits WHERE day < date('now', ?)`).bind(`-${RETENTION_DAYS} days`).run();
      })()
    );
  },
};

// Markdown for agents: a request that asks for text/markdown gets the
// Markdown copy the site build publishes next to each page (the homepage
// gets the AI profile). Anything without a copy falls back to HTML.
async function markdownFor(request, url) {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  const accept = request.headers.get("accept") || "";
  if (!/text\/markdown/i.test(accept) || ASSET.test(url.pathname) || /\.(md|txt)$/i.test(url.pathname)) return null;
  const p = url.pathname;
  const path = p === "/" ? "/ai.md" : p.endsWith("/") ? `${p}index.md` : p.endsWith(".html") ? p.replace(/\.html$/, ".md") : `${p}.md`;
  const res = await fetch(new Request(new URL(path, url), { method: request.method, headers: request.headers }));
  if (!res.ok) return null;
  const response = new Response(res.body, res);
  response.headers.set("content-type", "text/markdown; charset=utf-8");
  response.headers.set("vary", "Accept");
  response.headers.set("link", `<${url.origin}${p}>; rel="canonical"`);
  return { response, path };
}

async function log(request, response, env, url, servedPath) {
  if (request.method !== "GET" && request.method !== "HEAD") return;
  if (url.pathname.startsWith("/cdn-cgi/")) return;

  const ua = request.headers.get("user-agent") || "";
  const cf = request.cf || {};
  const { agent, kind } = classify(ua, cf.asOrganization);
  const isPage = !ASSET.test(url.pathname);
  // Humans: pages only. Bots: everything, so we see what they read.
  if (kind === "human" && !isPage) return;

  const referer = request.headers.get("referer") || "";
  const now = new Date();
  const day = now.toISOString().slice(0, 10);
  const ip = request.headers.get("cf-connecting-ip") || "";
  const visitor = await hash(`${ip}|${ua}|${day}|${env.HASH_SALT || "salt"}`);
  let refHost = "";
  try {
    refHost = referer ? new URL(referer).hostname : "";
  } catch {}

  await env.DB.prepare(
    `INSERT INTO hits (ts, day, path, status, cache, ua, agent, kind, referer, ref_source, country, asn, as_org, visitor)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      now.toISOString(),
      day,
      (servedPath || url.pathname).slice(0, 300),
      response.status,
      response.headers.get("cf-cache-status") || null,
      ua.slice(0, 400),
      agent,
      kind,
      refHost === url.hostname ? null : referer.slice(0, 300) || null,
      aiReferrer(referer, url),
      cf.country || null,
      cf.asn || null,
      (cf.asOrganization || "").slice(0, 120) || null,
      visitor
    )
    .run();
}

async function hash(s) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)]
    .slice(0, 8)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function authorized(request, env, url) {
  if (!env.STATS_KEY) return false;
  const fromQuery = url.searchParams.get("key");
  const cookie = (request.headers.get("cookie") || "").match(/(?:^|;\s*)stats_key=([^;]+)/);
  const given = fromQuery || (cookie && decodeURIComponent(cookie[1])) || "";
  if (given.length !== env.STATS_KEY.length) return false;
  let diff = 0;
  for (let i = 0; i < given.length; i++) diff |= given.charCodeAt(i) ^ env.STATS_KEY.charCodeAt(i);
  return diff === 0;
}

async function stats(request, env, ctx, url) {
  const noStore = { "cache-control": "no-store", "x-robots-tag": "noindex, nofollow" };
  if (!authorized(request, env, url)) {
    return new Response("Not found", { status: 404, headers: noStore });
  }
  const headers = { ...noStore };
  if (url.searchParams.get("key")) {
    headers["set-cookie"] = `stats_key=${encodeURIComponent(env.STATS_KEY)}; Path=/_stats; Max-Age=31536000; HttpOnly; Secure; SameSite=Strict`;
  }

  if (url.pathname === "/_stats/data.json") {
    const days = clampDays(url.searchParams.get("days"));
    const rows = await env.DB.prepare(`SELECT * FROM hits WHERE day >= date('now', ?) ORDER BY id DESC LIMIT 5000`).bind(`-${days} days`).all();
    return Response.json(rows.results, { headers });
  }
  const html = await renderDashboard(env, clampDays(url.searchParams.get("days")));
  return new Response(html, { headers: { ...headers, "content-type": "text/html; charset=utf-8" } });
}

function clampDays(v) {
  const n = Number(v) || 30;
  return Math.max(1, Math.min(365, Math.round(n)));
}
