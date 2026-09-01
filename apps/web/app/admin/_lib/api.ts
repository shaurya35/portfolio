const API_URL = process.env.NEXT_PUBLIC_RUST_API_URL;

export type PostSource = "x" | "medium" | "native";
export type PostStatus = "draft" | "published";

export type AdminPost = {
  id: number;
  slug: string;
  title: string;
  description: string;
  category: string;
  source: PostSource;
  url?: string;
  markdown?: string;
  status: PostStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type NewPostInput = {
  slug: string;
  title: string;
  description: string;
  category: string;
  status: PostStatus;
} & ({ source: "native"; markdown: string } | { source: "x" | "medium"; url: string });

export type PostUpdateInput = {
  title: string;
  description: string;
  category: string;
  status: PostStatus;
} & ({ source: "native"; markdown: string } | { source: "x" | "medium"; url: string });

export class ApiRequestError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function isUnauthorized(err: unknown): err is ApiRequestError {
  return err instanceof ApiRequestError && err.status === 401;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "content-type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    const message =
      body && typeof body === "object" && "error" in body && typeof body.error === "string"
        ? body.error
        : `request failed with status ${response.status}`;
    throw new ApiRequestError(response.status, message);
  }

  const text = await response.text();
  if (text.length === 0) {
    return undefined as T;
  }

  return JSON.parse(text) as T;
}

export function login(password: string): Promise<void> {
  return request<void>("/admin/login", {
    method: "POST",
    body: JSON.stringify({ password }),
  });
}

export function logout(): Promise<void> {
  return request<void>("/admin/logout", { method: "POST" });
}

export type AdminPostListParams = {
  q?: string;
  status?: PostStatus;
  category?: string;
  limit?: number;
  offset?: number;
};

export type AdminPostList = {
  posts: AdminPost[];
  total: number;
};

export function getPosts(params: AdminPostListParams = {}): Promise<AdminPostList> {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.status) search.set("status", params.status);
  if (params.category) search.set("category", params.category);
  if (params.limit !== undefined) search.set("limit", String(params.limit));
  if (params.offset !== undefined) search.set("offset", String(params.offset));

  const query = search.toString();
  return request<AdminPostList>(`/admin/posts${query ? `?${query}` : ""}`);
}

export function getPost(id: number): Promise<AdminPost> {
  return request<AdminPost>(`/admin/posts/${id}`);
}

export function createPost(input: NewPostInput): Promise<AdminPost> {
  return request<AdminPost>("/admin/posts", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updatePost(id: number, input: PostUpdateInput): Promise<AdminPost> {
  return request<AdminPost>(`/admin/posts/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deletePost(id: number): Promise<void> {
  return request<void>(`/admin/posts/${id}`, { method: "DELETE" });
}

export function bulkDeletePosts(ids: number[]): Promise<{ deleted: number }> {
  return request<{ deleted: number }>("/admin/posts", {
    method: "DELETE",
    body: JSON.stringify({ ids }),
  });
}

export type DailyCount = { date: string; pageviews: number; visitors: number };
export type PathCount = { path: string; count: number };
export type TargetCount = { target: string; count: number };
export type ReferrerCount = { referrer: string; count: number };
export type CountryCount = { country: string; count: number };

export type Stats = {
  daily: DailyCount[];
  top_paths: PathCount[];
  top_targets: TargetCount[];
  top_referrers: ReferrerCount[];
  countries: CountryCount[];
};

export function getStats(days: number): Promise<Stats> {
  return request<Stats>(`/admin/stats?days=${days}`);
}
