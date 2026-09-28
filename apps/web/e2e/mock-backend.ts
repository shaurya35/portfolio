// A stand-in for rust-be, so the end-to-end suite runs against a real
// production build of the site without a database. It implements the
// routes the site calls, in the same shapes, plus two test-only routes:
//
//   GET /__requests  every write the site sent (method, path, body), so a
//                    test can assert on exactly what the editor saved
//   GET /__events    every analytics beacon received
//
// State lives in memory for the lifetime of one test run. Tests only add to
// it (each uses its own slugs), because the site caches what it reads.

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { SEED_POSTS, SEED_TRAFFIC, type MockPost } from "./seed";

const PORT = Number(process.env.MOCK_BACKEND_PORT ?? 9191);
const ORIGIN = process.env.MOCK_BACKEND_ORIGIN ?? "http://127.0.0.1:3100";

const posts: MockPost[] = structuredClone(SEED_POSTS);
const requests: { method: string; path: string; body: unknown }[] = [];
const events: unknown[] = [];
let nextId = Math.max(...posts.map((post) => post.id)) + 1;

const now = () => new Date().toISOString();

// Close enough to rust-be's pulldown-cmark output for the site's purposes:
// the suite checks that pages render and what the editor sends, not the
// renderer itself (rust-be's own tests cover that).
function render(markdown: string): string {
  return markdown
    .split(/\n{2,}/)
    .map((block) => `<p>${block.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</p>`)
    .join("\n");
}

function publicSummary(post: MockPost) {
  const { slug, title, description, category, source, url, status, published_at, updated_at } =
    post;
  return { slug, title, description, category, source, url, status, published_at, updated_at };
}

// The admin list and write responses carry no html (see rust-be's AdminPost).
function adminShape(post: MockPost) {
  const rest: Partial<MockPost> = { ...post };
  delete rest.html;
  return rest;
}

function send(res: ServerResponse, status: number, body?: unknown) {
  const payload = body === undefined ? "" : JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json",
    "access-control-allow-origin": ORIGIN,
    "access-control-allow-credentials": "true",
    "access-control-allow-methods": "GET,POST,PATCH,DELETE",
    "access-control-allow-headers": "content-type",
  });
  res.end(payload);
}

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}

type PostInput = Partial<MockPost> & { markdown?: string; url?: string };

function applyInput(post: MockPost, input: PostInput) {
  post.title = input.title ?? post.title;
  post.description = input.description ?? post.description;
  post.category = input.category ?? post.category;
  post.source = input.source ?? post.source;
  if (post.source === "native") {
    post.markdown = input.markdown ?? post.markdown;
    post.html = render(post.markdown ?? "");
    delete post.url;
  } else {
    post.url = input.url ?? post.url;
    delete post.markdown;
    delete post.html;
  }
  if (input.status) {
    if (input.status === "published" && !post.published_at) post.published_at = now();
    post.status = input.status;
  }
  post.updated_at = now();
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://127.0.0.1:${PORT}`);
  const path = url.pathname;
  const method = req.method ?? "GET";

  if (method === "OPTIONS") return send(res, 204);

  const raw = method === "GET" ? "" : await readBody(req);
  let body: unknown = undefined;
  if (raw) {
    try {
      body = JSON.parse(raw);
    } catch {
      body = raw;
    }
  }
  if (method !== "GET" && path !== "/e") requests.push({ method, path, body });

  if (path === "/health") return send(res, 200, { status: "ok" });
  if (path === "/__requests") return send(res, 200, requests);
  if (path === "/__events") return send(res, 200, events);

  if (path === "/e" && method === "POST") {
    events.push(body);
    return send(res, 204);
  }

  if (path === "/posts" && method === "GET") {
    const published = posts
      .filter((post) => post.status === "published")
      .sort((a, b) => (b.published_at ?? "").localeCompare(a.published_at ?? ""));
    return send(res, 200, published.map(publicSummary));
  }

  const publicPost = path.match(/^\/posts\/([^/]+)$/);
  if (publicPost && method === "GET") {
    const post = posts.find((p) => p.slug === publicPost[1] && p.status === "published");
    return post ? send(res, 200, post) : send(res, 404, { error: "not found" });
  }

  if (path === "/admin/login" || path === "/admin/logout") return send(res, 200);

  if (path === "/admin/posts" && method === "GET") {
    const newestFirst = [...posts].sort((a, b) => b.created_at.localeCompare(a.created_at));
    return send(res, 200, newestFirst.map(adminShape));
  }

  if (path === "/admin/posts" && method === "POST") {
    const input = body as PostInput & { slug: string };
    if (posts.some((post) => post.slug === input.slug)) {
      return send(res, 409, { error: "slug already exists" });
    }
    const post: MockPost = {
      id: nextId++,
      slug: input.slug,
      title: "",
      description: "",
      category: "",
      source: "native",
      status: "draft",
      published_at: null,
      created_at: now(),
      updated_at: now(),
    };
    applyInput(post, input);
    posts.push(post);
    return send(res, 201, adminShape(post));
  }

  const adminPost = path.match(/^\/admin\/posts\/(\d+)$/);
  if (adminPost) {
    const post = posts.find((p) => p.id === Number(adminPost[1]));
    if (!post) return send(res, 404, { error: "not found" });
    if (method === "GET") return send(res, 200, post);
    if (method === "PATCH") {
      applyInput(post, body as PostInput);
      return send(res, 200, adminShape(post));
    }
    if (method === "DELETE") {
      posts.splice(posts.indexOf(post), 1);
      return send(res, 204);
    }
  }

  if (path === "/admin/stats/posts" && method === "GET") {
    return send(
      res,
      200,
      posts.map((post) => ({
        slug: post.slug,
        views: SEED_TRAFFIC[post.slug]?.views ?? 0,
        clicks: SEED_TRAFFIC[post.slug]?.clicks ?? 0,
      })),
    );
  }

  if (path === "/admin/stats" && method === "GET") {
    const today = new Date().toISOString().slice(0, 10);
    return send(res, 200, {
      daily: [{ date: today, pageviews: 12, visitors: 5 }],
      top_paths: [],
      top_targets: [],
      top_referrers: [],
      countries: [],
      devices: [],
    });
  }

  send(res, 404, { error: "not found" });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`mock backend on http://127.0.0.1:${PORT}`);
});
