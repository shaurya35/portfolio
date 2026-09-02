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

/** What `GET /admin/posts/{id}` returns — `AdminPost` plus the cached
 * rendered HTML, for the preview screen. `html` is only present for a
 * native post; `x`/`medium` posts have nothing to render. */
export type AdminPostDetail = AdminPost & { html?: string | null };

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

export function getPosts(): Promise<AdminPost[]> {
  return request<AdminPost[]>("/admin/posts");
}

export function getPost(id: number): Promise<AdminPostDetail> {
  return request<AdminPostDetail>(`/admin/posts/${id}`);
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

export type DailyCount = { date: string; pageviews: number; visitors: number };
export type PathCount = { path: string; title: string | null; count: number };
export type TargetCount = { target: string; count: number };
export type ReferrerCount = { referrer: string; count: number };
export type CountryCount = { country: string; count: number };
export type DeviceCount = { device: string; count: number };

export type Stats = {
  daily: DailyCount[];
  top_paths: PathCount[];
  top_targets: TargetCount[];
  top_referrers: ReferrerCount[];
  countries: CountryCount[];
  devices: DeviceCount[];
};

export function getStats(days: number): Promise<Stats> {
  return request<Stats>(`/admin/stats?days=${days}`);
}
