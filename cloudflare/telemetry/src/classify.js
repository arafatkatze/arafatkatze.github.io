// Who is visiting? Order matters: the more specific user agents come first
// (Claude-User before ClaudeBot, Applebot-Extended before Applebot, ...).

// kind:
//   ai_assistant  an assistant fetching a page live for a person (best signal)
//   ai_search     an AI search index crawler (feeds answers with citations)
//   ai_training   a crawler collecting training data
//   search        classic search engines
//   social        link-preview fetchers
//   other_bot     scripts, uptime checkers, unknown crawlers
//   suspect       claims to be a browser but looks automated
//   human         everything else
const AGENTS = [
  // Live fetches on behalf of a user
  [/ChatGPT-User/i, "ChatGPT-User", "ai_assistant"],
  [/Claude-User/i, "Claude-User", "ai_assistant"],
  [/Perplexity-User/i, "Perplexity-User", "ai_assistant"],
  [/MistralAI-User/i, "MistralAI-User", "ai_assistant"],
  [/Gemini-Deep-Research|Google-Agent/i, "Google-Agent", "ai_assistant"],
  [/Meta-ExternalFetcher/i, "Meta-ExternalFetcher", "ai_assistant"],
  [/DuckAssistBot/i, "DuckAssistBot", "ai_assistant"],
  // AI search indexes
  [/OAI-SearchBot/i, "OAI-SearchBot", "ai_search"],
  [/Claude-SearchBot/i, "Claude-SearchBot", "ai_search"],
  [/PerplexityBot/i, "PerplexityBot", "ai_search"],
  [/YouBot/i, "YouBot", "ai_search"],
  [/Bravebot/i, "Bravebot", "ai_search"],
  [/Kangaroo Bot/i, "Kangaroo Bot", "ai_search"],
  // Training crawlers
  [/GPTBot/i, "GPTBot", "ai_training"],
  [/ClaudeBot/i, "ClaudeBot", "ai_training"],
  [/anthropic-ai/i, "anthropic-ai", "ai_training"],
  [/Applebot-Extended/i, "Applebot-Extended", "ai_training"],
  [/CCBot/i, "CCBot", "ai_training"],
  [/Bytespider/i, "Bytespider", "ai_training"],
  [/meta-externalagent/i, "meta-externalagent", "ai_training"],
  [/Amazonbot/i, "Amazonbot", "ai_training"],
  [/cohere-(ai|training)/i, "cohere", "ai_training"],
  [/DeepSeekBot/i, "DeepSeekBot", "ai_training"],
  [/AI2Bot/i, "AI2Bot", "ai_training"],
  [/Diffbot/i, "Diffbot", "ai_training"],
  [/TikTokSpider/i, "TikTokSpider", "ai_training"],
  [/Timpibot/i, "Timpibot", "ai_training"],
  [/xAI|GrokBot/i, "xAI", "ai_training"],
  // Search engines
  [/Googlebot|Google-InspectionTool|GoogleOther/i, "Googlebot", "search"],
  [/bingbot|BingPreview/i, "Bingbot", "search"],
  [/Applebot/i, "Applebot", "search"],
  [/DuckDuckBot/i, "DuckDuckBot", "search"],
  [/YandexBot/i, "YandexBot", "search"],
  [/Baiduspider/i, "Baiduspider", "search"],
  [/PetalBot/i, "PetalBot", "search"],
  // Link previews
  [/facebookexternalhit|facebookcatalog/i, "Facebook", "social"],
  [/Twitterbot/i, "Twitterbot", "social"],
  [/LinkedInBot/i, "LinkedInBot", "social"],
  [/Slackbot/i, "Slackbot", "social"],
  [/Discordbot/i, "Discordbot", "social"],
  [/WhatsApp/i, "WhatsApp", "social"],
  [/TelegramBot/i, "TelegramBot", "social"],
];

const GENERIC_BOT =
  /bot\b|crawler|spider|scrap|curl\/|wget|python-requests|python-httpx|aiohttp|node-fetch|axios|go-http-client|okhttp|java\/|libwww|headless|phantomjs|puppeteer|playwright|lighthouse|uptime|monitor|feed|rss/i;

// Cloud and hosting networks. A "normal browser" from one of these is
// usually a crawler in disguise (Ramp saw DeepSeek pose as 2017 Chrome).
// Also proxy and scraping networks seen crawling every page as "Chrome".
const CLOUD_ASN_ORG =
  /amazon|aws|google cloud|google llc|microsoft|azure|alibaba|aliyun|tencent|huawei|digitalocean|ovh|hetzner|oracle|linode|akamai|vultr|choopa|contabo|scaleway|leaseweb|m247|datacamp|baidu|bytedance|volcano|kingsoft|ucloud|code200|techties|6 collyer quay|bright data|oxylabs|smartproxy|iproyal|netnut|soax/i;

export const AI_REFERRERS = [
  [/(^|\.)chatgpt\.com$|(^|\.)chat\.openai\.com$/i, "chatgpt"],
  [/(^|\.)perplexity\.ai$/i, "perplexity"],
  [/(^|\.)claude\.ai$/i, "claude"],
  [/(^|\.)gemini\.google\.com$|(^|\.)bard\.google\.com$/i, "gemini"],
  [/(^|\.)copilot\.microsoft\.com$/i, "copilot"],
  [/(^|\.)chat\.deepseek\.com$/i, "deepseek"],
  [/(^|\.)grok\.com$|(^|\.)x\.ai$/i, "grok"],
  [/(^|\.)meta\.ai$/i, "meta-ai"],
  [/(^|\.)you\.com$/i, "you"],
  [/(^|\.)phind\.com$/i, "phind"],
  [/(^|\.)poe\.com$/i, "poe"],
  [/(^|\.)chat\.mistral\.ai$/i, "mistral"],
  [/(^|\.)kimi\.(com|ai)$|(^|\.)moonshot\.cn$/i, "kimi"],
];

export function classify(ua, asOrg) {
  ua = ua || "";
  for (const [re, name, kind] of AGENTS) {
    if (re.test(ua)) return { agent: name, kind };
  }
  if (!ua || GENERIC_BOT.test(ua)) {
    const m = ua.match(/^([A-Za-z][\w.-]{1,40})/);
    return { agent: m ? m[1] : "unknown", kind: "other_bot" };
  }
  const browser = browserName(ua);
  const chrome = ua.match(/Chrome\/(\d+)/);
  const oldChrome = chrome && Number(chrome[1]) < 100;
  if (oldChrome || (asOrg && CLOUD_ASN_ORG.test(asOrg))) {
    return { agent: `${browser} (suspect)`, kind: "suspect" };
  }
  return { agent: browser, kind: "human" };
}

function browserName(ua) {
  if (/Edg\//.test(ua)) return "Edge";
  if (/OPR\//.test(ua)) return "Opera";
  if (/Firefox\//.test(ua)) return "Firefox";
  if (/Chrome\//.test(ua)) return "Chrome";
  if (/Safari\//.test(ua)) return "Safari";
  return "Browser";
}

export function aiReferrer(referer, url) {
  const utm = url.searchParams.get("utm_source") || "";
  for (const [re, name] of AI_REFERRERS) {
    if (utm && re.test(utm.replace(/^https?:\/\//, "").split("/")[0])) return name;
  }
  if (!referer) return null;
  let host;
  try {
    host = new URL(referer).hostname;
  } catch {
    return null;
  }
  for (const [re, name] of AI_REFERRERS) {
    if (re.test(host)) return name;
  }
  return null;
}
