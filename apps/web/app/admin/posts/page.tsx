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
import { LogoutButton } from "@/app/admin/_components/logout-button";
import { StatusBadge } from "@/app/admin/_components/status-badge";

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
    const confirmed = window.confirm(`Delete "${post.title}"? This cannot be undone.`);
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
    <section className="py-8">
      <div className="flex items-center justify-between pb-8">
        <div>
          <h1 className="text-2xl font-bold">Posts</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage drafts and published posts.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/posts/new"
            className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            New post
          </Link>
          <LogoutButton />
        </div>
      </div>

      {error ? <p className="text-sm text-red-500">{error}</p> : null}

      {posts === null && !error ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : null}

      {posts !== null && posts.length === 0 ? (
        <p className="text-sm text-muted-foreground">No posts yet.</p>
      ) : null}

      {posts !== null && posts.length > 0 ? (
        <ul className="flex flex-col divide-y divide-border border-y border-border">
          {posts.map((post) => (
            <li key={post.id} className="flex items-center justify-between gap-4 py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium">{post.title}</span>
                  <StatusBadge status={post.status} />
                </div>
                <p className="mt-0.5 truncate text-sm text-muted-foreground">
                  {post.slug} · {post.category} · {post.source}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <Link
                  href={`/admin/posts/${post.id}`}
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  Edit
                </Link>
                <button
                  type="button"
                  onClick={() => handleDelete(post)}
                  disabled={deletingId === post.id}
                  className="cursor-pointer text-sm text-red-500 transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {deletingId === post.id ? "Deleting…" : "Delete"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
