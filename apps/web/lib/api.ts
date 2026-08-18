import type { Writing, WritingSource, WritingStatus } from "@/types/writing";

const REVALIDATE_SECONDS = 3600;

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
  const res = await fetch(`${process.env.RUST_API_URL}/posts`, {
    next: { revalidate: REVALIDATE_SECONDS },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch posts: ${res.status}`);
  }

  const posts: PostSummary[] = await res.json();
  return posts.map(toWriting);
}

export async function getPost(slug: string): Promise<Writing | undefined> {
  const res = await fetch(
    `${process.env.RUST_API_URL}/posts/${encodeURIComponent(slug)}`,
    { next: { revalidate: REVALIDATE_SECONDS } },
  );

  if (res.status === 404) {
    return undefined;
  }

  if (!res.ok) {
    throw new Error(`Failed to fetch post "${slug}": ${res.status}`);
  }

  const post: PostDetail = await res.json();
  return toWritingDetail(post);
}
