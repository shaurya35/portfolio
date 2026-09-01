"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { type AdminPost, ApiRequestError, getPost, isUnauthorized, updatePost } from "@/app/admin/_lib/api";
import { PostForm, type PostFormValues } from "@/app/admin/_components/post-form";
import { useAdminError } from "@/app/admin/_lib/use-admin-error";
import { useToast } from "@/components/toast";

export function EditPostView({ id }: { id: string }) {
  const router = useRouter();
  const onError = useAdminError();
  const { show } = useToast();
  const postId = Number(id);
  const validId = Number.isInteger(postId);

  const [post, setPost] = useState<AdminPost | undefined>(undefined);
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

  const handleSubmit = async (values: PostFormValues) => {
    const body =
      values.source === "native"
        ? { source: "native" as const, markdown: values.markdown }
        : { source: values.source, url: values.url };

    try {
      await updatePost(postId, {
        title: values.title,
        description: values.description,
        category: values.category,
        status: values.status,
        ...body,
      });
    } catch (err) {
      if (isUnauthorized(err)) {
        onError(err, "Failed to save changes.");
        return;
      }
      throw err;
    }

    show("Changes saved.");
    router.push("/admin/posts");
  };

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
      <div className="pb-8">
        <h1 className="text-2xl font-bold">Edit post</h1>
      </div>

      <PostForm initial={post} submitLabel="Save changes" onSubmit={handleSubmit} />
    </section>
  );
}
