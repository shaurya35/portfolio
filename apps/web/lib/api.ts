import type { Writing, WritingSource, WritingStatus } from "@/types/writing";

// A backstop, not the mechanism: revalidateTag("posts") in
// app/api/revalidate/route.ts is what makes a publish show up, and it works
// (the days-of-staleness incident was rust-be's REVALIDATE_URL being wrong,
// since fixed). At 60s this window was re-polling the Rust backend ~1440
// times a day per cache entry, and because that backend cold-starts on
// almost every request — Vercel bills a cold start as Active CPU — the
// backstop, not real traffic, was the single largest line on the compute
// bill.
//
// A day, not an hour: at 3600 this still costs up to ~3.6k background
// refetches a month, which is more than the analytics beacon — every real
// pageview on the site — puts through the same backend. The webhook is the
// mechanism and it works; this only has to catch the case where it silently
// stops, and catching that within a day is fine.
const POSTS_REVALIDATE_SECONDS = 86400;
const POSTS_TAG = "posts";

/** Thrown when the backend URL is missing, to separate a deployment
 * misconfiguration from an ordinary request failure in build logs. */
class ApiConfigError extends Error {}

function apiBase(): string {
  const base = process.env.RUST_API_URL;

  if (!base) {
    throw new ApiConfigError(
      "RUST_API_URL is not set. Next reads it from apps/web/.env locally, but " +
        "on Vercel it comes from the project environment — and Turborepo runs " +
        "tasks in strict env mode, so it must also be listed under tasks.build.env " +
        "in turbo.json or it is stripped before next build runs.",
    );
  }

  // A trailing slash would produce "//posts", which some proxies treat as a
  // different route than "/posts".
  return base.replace(/\/+$/, "");
}

type PostSummary = {
  slug: string;
  title: string;
  description: string;
  category: string;
  source: WritingSource;
  url?: string;
  status: WritingStatus;
  published_at: string;
  updated_at: string;
};

type PostDetail = PostSummary & {
  id: number;
  html?: string;
  created_at: string;
  updated_at: string;
};

function toWriting(post: PostSummary): Writing {
  return {
    slug: post.slug,
    title: post.title,
    description: post.description,
    date: post.published_at,
    category: post.category,
    source: post.source,
    href: post.url,
    updatedAt: post.updated_at,
  };
}

function toWritingDetail(post: PostDetail): Writing {
  return {
    ...toWriting(post),
    html: post.html,
    status: post.status,
  };
}

export async function getPosts(): Promise<Writing[]> {
  const res = await fetch(`${apiBase()}/posts`, {
    next: { revalidate: POSTS_REVALIDATE_SECONDS, tags: [POSTS_TAG] },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch posts: ${res.status}`);
  }

  const posts: PostSummary[] = await res.json();
  return posts.map(toWriting);
}

export async function getPost(slug: string): Promise<Writing | undefined> {
  const res = await fetch(`${apiBase()}/posts/${encodeURIComponent(slug)}`, {
    next: { revalidate: POSTS_REVALIDATE_SECONDS, tags: [POSTS_TAG] },
  });

  if (res.status === 404) {
    return undefined;
  }

  if (!res.ok) {
    throw new Error(`Failed to fetch post "${slug}": ${res.status}`);
  }

  const post: PostDetail = await res.json();
  return toWritingDetail(post);
}
