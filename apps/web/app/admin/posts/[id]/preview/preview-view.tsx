"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  type AdminPostDetail,
  ApiRequestError,
  getPost,
} from "@/app/admin/_lib/api";
import { useAdminError } from "@/app/admin/_lib/use-admin-error";
import { PostArticle } from "@/components/post-article";
import { ArrowLeftIcon } from "@/components/icons";

/**
 * Renders through the exact same `PostArticle` component as the public
 * `/writing/[slug]` page, using the `html` the backend already rendered at
 * write time (see `render_native_html` in rust-be's `routes/admin.rs`) —
 * draft or published. That's why this needs no client-side markdown
 * rendering of its own: it's showing production's own output, just gated
 * behind the admin session instead of `status = 'published'`.
 */
export function PreviewView({ id }: { id: string }) {
  const onError = useAdminError();
  const postId = Number(id);
  const validId = Number.isInteger(postId);

  const [post, setPost] = useState<AdminPostDetail | undefined>(undefined);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!validId) {
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const result = await getPost(postId);
        if (cancelled) return;
        setPost(result);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiRequestError && err.status === 404) {
          setNotFound(true);
          return;
        }
        onError(err, "Failed to load post.");
        setLoadError("Failed to load post.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [postId, validId, onError]);

  if (!validId || notFound) {
    return <p className="py-8 text-sm text-muted-foreground">Post not found.</p>;
  }

  if (loadError) {
    return <p className="py-8 text-sm text-destructive">{loadError}</p>;
  }

  if (post === undefined) {
    return <p className="py-8 text-sm text-muted-foreground">Loading…</p>;
  }

  return (
    <section className="py-8">
      <Link
        href={`/admin/posts/${postId}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" />
        Back to editor
      </Link>

      <div className="mt-6 mb-8 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">
          {post.status === "published" ? "Published" : "Draft"} preview
        </span>
        <span>— showing the last saved version, not unsaved edits.</span>
        {post.status === "published" ? (
          <Link
            href={`/writing/${post.slug}`}
            className="text-accent transition-colors hover:underline"
          >
            View live
          </Link>
        ) : null}
      </div>

      {post.source === "native" && post.html ? (
        <PostArticle
          post={{
            title: post.title,
            description: post.description,
            category: post.category,
            date: post.published_at ?? undefined,
            html: post.html,
          }}
          showShare={false}
        />
      ) : (
        <p className="text-sm text-muted-foreground">
          {post.source === "native"
            ? "This post has no rendered content yet."
            : `This post links out to ${post.url} — nothing to preview here.`}
        </p>
      )}
    </section>
  );
}
