import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPost, getPosts } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { CalendarIcon } from "@/components/icons";
import type { Writing } from "@/types/writing";

export async function generateStaticParams() {
  const posts = await getPosts();
  return posts
    .filter((post) => post.source === "native")
    .map((post) => ({ slug: post.slug }));
}

async function getNativePost(
  slug: string,
): Promise<(Writing & { html: string }) | undefined> {
  const post = await getPost(slug);
  if (!post || post.source !== "native" || post.html == null) {
    return undefined;
  }
  return { ...post, html: post.html };
}

export async function generateMetadata({
  params,
}: PageProps<"/writing/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const post = await getNativePost(slug);

  if (!post) {
    return {};
  }

  return {
    title: post.title,
    description: post.description,
  };
}

export default async function WritingPostPage({
  params,
}: PageProps<"/writing/[slug]">) {
  const { slug } = await params;
  const post = await getNativePost(slug);

  if (!post) {
    notFound();
  }

  return (
    <article className="py-8">
      <div className="pb-8">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span>{post.category}</span>
          <span className="inline-flex items-center gap-1">
            <CalendarIcon className="size-3.5" />
            {formatDate(post.date)}
          </span>
        </div>
        <h1 className="mt-2 text-2xl font-bold">{post.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{post.description}</p>
      </div>

      <div
        className="max-w-none text-sm leading-relaxed text-foreground [&_a]:text-accent [&_a]:underline [&_a]:underline-offset-2 [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs [&_h1]:mt-8 [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mt-6 [&_h3]:text-lg [&_h3]:font-semibold [&_li]:mt-1 [&_ol]:mt-4 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mt-4 [&_pre]:mt-4 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-muted [&_pre]:p-4 [&_pre]:text-xs [&_table]:mt-4 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-1.5 [&_th]:border [&_th]:border-border [&_th]:bg-muted [&_th]:px-3 [&_th]:py-1.5 [&_th]:text-left [&_th]:font-semibold [&_ul]:mt-4 [&_ul]:list-disc [&_ul]:pl-5"
        dangerouslySetInnerHTML={{ __html: post.html }}
      />
    </article>
  );
}
