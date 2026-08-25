import type { Writing, WritingSource, WritingStatus } from "@/types/writing";

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
  const res = await fetch(`${apiBase()}/posts`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to fetch posts: ${res.status}`);
  }

  const posts: PostSummary[] = await res.json();
  return posts.map(toWriting);
}

export async function getPost(slug: string): Promise<Writing | undefined> {
  const res = await fetch(`${apiBase()}/posts/${encodeURIComponent(slug)}`, {
    cache: "no-store",
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
