import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPost, getPosts } from "@/lib/api";
import { formatDate, readingTime } from "@/lib/format";
import { ArrowLeftIcon } from "@/components/icons";
import { ShareButton } from "@/components/share-button";
import { ReadingProgress } from "@/components/reading-progress";
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
      <ReadingProgress />

      <Link
        href="/writing"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" />
        Back to Writing
      </Link>

      <div className="mt-6 border-b border-border pb-8">
        <h1 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
          {post.title}
        </h1>
        <p className="mt-3 text-base text-muted-foreground">{post.description}</p>
        <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
          <span className="rounded-md border border-border px-2 py-0.5 text-xs">
            {post.category}
          </span>
          <span>{formatDate(post.date)}</span>
          <span>·</span>
          <span>{readingTime(post.html)}</span>
          <ShareButton />
        </div>
      </div>

      <div
        className="post-content pt-8"
        dangerouslySetInnerHTML={{ __html: post.html }}
      />
    </article>
  );
}
