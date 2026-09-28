"use client";

import { useRouter } from "next/navigation";
import { createPost } from "@/app/admin/_lib/api";
import { PostForm, type PostFormValues } from "@/app/admin/_components/post-form";
import { useSyncPublicPages } from "@/app/admin/_lib/use-sync-public-pages";
import { useToast } from "@/components/toast";

export default function NewPostPage() {
  const router = useRouter();
  const { show } = useToast();
  const syncPublicPages = useSyncPublicPages();

  const handleSubmit = async (values: PostFormValues) => {
    const body =
      values.source === "native"
        ? { source: "native" as const, markdown: values.markdown }
        : { source: values.source, url: values.url };

    // Failures (401 session expired, 409 slug conflict, anything else) are
    // left to PostForm, which reports them inline and keeps what was typed.
    await createPost({
      slug: values.slug,
      title: values.title,
      description: values.description,
      category: values.category,
      status: values.status,
      ...body,
    });

    show("Post created.");
    // Not awaited, for the same reason as in edit-post-view.tsx: PostForm
    // keeps the form "unsaved" until this handler returns.
    void syncPublicPages();
    router.push("/admin/posts");
  };

  return (
    <section className="py-8">
      <div className="pb-8">
        <h1 className="text-2xl font-bold">New post</h1>
      </div>

      <PostForm submitLabel="Create post" onSubmit={handleSubmit} />
    </section>
  );
}
