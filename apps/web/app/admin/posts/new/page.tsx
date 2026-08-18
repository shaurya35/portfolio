"use client";

import { useRouter } from "next/navigation";
import { createPost } from "@/app/admin/_lib/api";
import { PostForm, type PostFormValues } from "@/app/admin/_components/post-form";

export default function NewPostPage() {
  const router = useRouter();

  const handleSubmit = async (values: PostFormValues) => {
    const body =
      values.source === "native"
        ? { source: "native" as const, markdown: values.markdown }
        : { source: values.source, url: values.url };

    await createPost({
      slug: values.slug,
      title: values.title,
      description: values.description,
      category: values.category,
      status: values.status,
      ...body,
    });

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
