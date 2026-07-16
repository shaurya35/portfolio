import type { Metadata } from "next";
import { blogPosts } from "@/content/blog";
import { BlogList } from "@/components/blog-list";

export const metadata: Metadata = {
  title: "Blog",
  description: "Notes on building products, careers, and startups.",
};

export default function BlogPage() {
  return (
    <section className="py-8">
      <div className="pb-8">
        <h1 className="text-2xl font-bold">Blog</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Notes on building products, careers, and startups.
        </p>
      </div>

      <BlogList posts={blogPosts} />
    </section>
  );
}
