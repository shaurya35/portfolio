"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  type AdminPost,
  ApiRequestError,
  deletePost,
  getPosts,
} from "@/app/admin/_lib/api";
import { StatusBadge } from "@/app/admin/_components/status-badge";
import { TrashIcon } from "@/components/icons";

export default function AdminPostsPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<AdminPost[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const result = await getPosts();
        if (cancelled) return;
        setPosts(result);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiRequestError && err.status === 401) {
          router.replace("/admin");
          return;
        }
        setError("Failed to load posts.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const handleDelete = async (post: AdminPost) => {
    const confirmed = window.confirm(
      `Delete "${post.title}"? This cannot be undone.`,
    );
    if (!confirmed) return;

    setDeletingId(post.id);
    try {
      await deletePost(post.id);
      setPosts((current) => current?.filter((p) => p.id !== post.id) ?? null);
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 401) {
        router.replace("/admin");
        return;
      }
      window.alert("Failed to delete post.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section className="pb-8">
      <div className="flex items-center justify-between py-8">
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
          {posts.map((post) => (
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
          ))}
        </ul>
      ) : null}
    </section>
  );
}
