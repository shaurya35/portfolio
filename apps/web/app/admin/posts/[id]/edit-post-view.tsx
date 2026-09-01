"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { type AdminPost, ApiRequestError, getPosts, updatePost } from "@/app/admin/_lib/api";
import { PostForm, type PostFormValues } from "@/app/admin/_components/post-form";

export function EditPostView({ id }: { id: string }) {
  const router = useRouter();
  const postId = Number(id);
  const validId = Number.isInteger(postId);

  const [post, setPost] = useState<AdminPost | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!validId) {
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const posts = await getPosts();
        if (cancelled) return;
        setPost(posts.find((p) => p.id === postId) ?? null);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiRequestError && err.status === 401) {
          router.replace("/admin");
          return;
        }
        setError("Failed to load post.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [postId, validId, router]);

  const handleSubmit = async (values: PostFormValues) => {
    const body =
      values.source === "native"
        ? { source: "native" as const, markdown: values.markdown }
        : { source: values.source, url: values.url };

    await updatePost(postId, {
      title: values.title,
      description: values.description,
      category: values.category,
      status: values.status,
      ...body,
    });

    router.push("/admin/posts");
  };

  if (!validId || post === null) {
    return <p className="py-8 text-sm text-muted-foreground">Post not found.</p>;
  }

  if (error) {
    return <p className="py-8 text-sm text-destructive">{error}</p>;
  }

  if (post === undefined) {
    return <p className="py-8 text-sm text-muted-foreground">Loading…</p>;
  }

  return (
    <section className="pb-8">
      <div className="py-8">
        <h1 className="text-2xl font-bold">Edit post</h1>
      </div>

      <PostForm initial={post} submitLabel="Save changes" onSubmit={handleSubmit} />
    </section>
  );
}
