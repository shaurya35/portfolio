"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  type AdminPost,
  type PostTraffic,
  deletePost,
  getPosts,
  getPostTraffic,
} from "@/app/admin/_lib/api";
import { StatusBadge } from "@/app/admin/_components/status-badge";
import { TrashIcon } from "@/components/icons";
import { useAdminError } from "@/app/admin/_lib/use-admin-error";
import { useSyncPublicPages } from "@/app/admin/_lib/use-sync-public-pages";
import { useToast } from "@/components/toast";

const TRAFFIC_DAYS = 30;

/** "41 views" for a native post, "9 clicks" for an X/Medium one — the only
 * traffic each kind has on this site. */
function trafficLabel(post: AdminPost, traffic: PostTraffic | undefined): string | null {
  if (!traffic || post.status !== "published") return null;
  const [count, noun] =
    post.source === "native" ? [traffic.views, "view"] : [traffic.clicks, "click"];
  return `${count.toLocaleString()} ${noun}${count === 1 ? "" : "s"}`;
}

export default function AdminPostsPage() {
  const onError = useAdminError();
  const { show } = useToast();
  const syncPublicPages = useSyncPublicPages();

  const [posts, setPosts] = useState<AdminPost[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [traffic, setTraffic] = useState<Map<string, PostTraffic>>(new Map());

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const result = await getPosts();
        if (cancelled) return;
        setPosts(result);
      } catch (err) {
        if (cancelled) return;
        onError(err, "Failed to load posts.");
        setError("Failed to load posts.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [onError]);

  // Separate from the list and allowed to fail quietly: the counts are a
  // nice-to-have, and a stats hiccup must not stop the posts from loading.
  useEffect(() => {
    let cancelled = false;
    getPostTraffic(TRAFFIC_DAYS)
      .then((rows) => {
        if (!cancelled) setTraffic(new Map(rows.map((row) => [row.slug, row])));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const handleDelete = async (post: AdminPost) => {
    const confirmed = window.confirm(
      `Delete "${post.title}"? This cannot be undone.`,
    );
    if (!confirmed) return;

    setDeletingId(post.id);
    try {
      await deletePost(post.id);
      setPosts((current) => current?.filter((p) => p.id !== post.id) ?? null);
      show("Post deleted.");
    } catch (err) {
      onError(err, "Failed to delete post.");
      return;
    } finally {
      setDeletingId(null);
    }
    // Outside the try: syncPublicPages() handles its own failure, and a
    // refresh problem must not be reported as "Failed to delete post."
    await syncPublicPages();
  };

  return (
    <section className="py-8">
      <div className="flex items-center justify-between pb-8">
        <div>
          <h1 className="text-2xl font-bold">Posts</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage drafts and published posts.
          </p>
        </div>
        <Link
          href="/admin/posts/new"
          className="rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
        >
          New post
        </Link>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {posts === null && !error ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : null}

      {posts !== null && posts.length === 0 ? (
        <p className="text-sm text-muted-foreground">No posts yet.</p>
      ) : null}

      {posts !== null && posts.length > 0 ? (
        <ul className="flex flex-col divide-y divide-border border-y border-border">
          {posts.map((post) => {
            const trafficText = trafficLabel(post, traffic.get(post.slug));
            return (
              <li
                key={post.id}
                className="group relative flex items-center justify-between gap-4 py-3"
              >
                <div className="min-w-0">
                  <Link
                    href={`/admin/posts/${post.id}`}
                    className="block truncate font-medium after:absolute after:inset-0"
                  >
                    {post.title}
                  </Link>
                  <p className="mt-1 flex items-center gap-2 truncate text-xs text-muted-foreground">
                    <StatusBadge status={post.status} />
                    <span aria-hidden="true" className="text-border">
                      |
                    </span>
                    <span className="truncate">
                      {post.slug} · {post.category} · {post.source}
                    </span>
                    {trafficText ? (
                      <span
                        className="shrink-0 tabular-nums"
                        title={`Last ${TRAFFIC_DAYS} days`}
                      >
                        · {trafficText}
                      </span>
                    ) : null}
                  </p>
                </div>
                <div className="relative z-10 flex shrink-0 items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleDelete(post)}
                    disabled={deletingId === post.id}
                    aria-label="Delete post"
                    className="cursor-pointer text-muted-foreground transition-colors hover:text-destructive disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <TrashIcon className="size-4" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
