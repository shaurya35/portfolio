"use client";

import { useRouter } from "next/navigation";
import { createPost, isUnauthorized } from "@/app/admin/_lib/api";
import { PostForm, type PostFormValues } from "@/app/admin/_components/post-form";
import { useAdminError } from "@/app/admin/_lib/use-admin-error";
import { useToast } from "@/app/admin/_components/toast";

export default function NewPostPage() {
  const router = useRouter();
  const onError = useAdminError();
  const { show } = useToast();

  const handleSubmit = async (values: PostFormValues) => {
    const body =
      values.source === "native"
        ? { source: "native" as const, markdown: values.markdown }
        : { source: values.source, url: values.url };

    try {
      await createPost({
        slug: values.slug,
        title: values.title,
        description: values.description,
        category: values.category,
        status: values.status,
        ...body,
      });
    } catch (err) {
      // A 401 here previously fell straight into PostForm's generic error
      // path instead of redirecting to login. Handle that case ourselves;
      // everything else (409 slug conflict, other failures) still goes to
      // PostForm's own inline error handling, so it isn't shown twice.
      if (isUnauthorized(err)) {
        onError(err, "Failed to create post.");
        return;
      }
      throw err;
    }

    show("Post created.");
    router.push("/admin/posts");
  };

  return (
    <section className="pb-8">
      <div className="py-8">
        <h1 className="text-2xl font-bold">New post</h1>
      </div>

      <PostForm submitLabel="Create post" onSubmit={handleSubmit} />
    </section>
  );
}
