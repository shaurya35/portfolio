// Turns a request's user agent into the short name the admin stats page
// shows for /llms.txt fetches. Order matters: the more specific names come
// first, since e.g. "Claude-SearchBot" also contains "bot".
const KNOWN_AGENTS: [needle: string, name: string][] = [
  ["claude-user", "Claude-User"],
  ["claude-searchbot", "Claude-SearchBot"],
  ["claudebot", "ClaudeBot"],
  ["anthropic-ai", "ClaudeBot"],
  ["chatgpt-user", "ChatGPT-User"],
  ["oai-searchbot", "OAI-SearchBot"],
  ["gptbot", "GPTBot"],
  ["perplexity-user", "Perplexity-User"],
  ["perplexitybot", "PerplexityBot"],
  ["mistralai-user", "MistralAI-User"],
  ["google-extended", "Google-Extended"],
  ["googlebot", "Googlebot"],
  ["bingbot", "Bingbot"],
  ["duckassistbot", "DuckAssistBot"],
  ["applebot", "Applebot"],
  ["amazonbot", "Amazonbot"],
  ["meta-externalagent", "Meta-ExternalAgent"],
  ["bytespider", "Bytespider"],
  ["ccbot", "CCBot"],
  ["cohere-ai", "Cohere"],
  ["youbot", "YouBot"],
  ["curl/", "curl"],
  ["wget/", "wget"],
  ["python-requests", "Python"],
  ["python-httpx", "Python"],
  ["aiohttp", "Python"],
  ["node-fetch", "Node"],
  ["axios/", "Node"],
  ["undici", "Node"],
  ["go-http-client", "Go"],
];

const GENERIC_BOT = /bot|crawl|spider|scrape|fetch/i;

export function agentName(userAgent: string | null): string {
  const ua = (userAgent ?? "").toLowerCase();
  if (!ua) return "Unknown";

  for (const [needle, name] of KNOWN_AGENTS) {
    if (ua.includes(needle)) return name;
  }
  if (GENERIC_BOT.test(ua)) return "Other bot";
  if (ua.startsWith("mozilla/")) return "Browser";
  return "Other";
}
