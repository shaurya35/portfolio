import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPost, getPosts } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { CalendarIcon, ArrowLeftIcon } from "@/components/icons";
import { ShareButton } from "@/components/share-button";
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
      <Link
        href="/writing"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeftIcon className="size-3.5" />
        Back to Writing
      </Link>

      <div className="pb-8">
        <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
          {post.title}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{post.description}</p>
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 border-y border-border py-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <CalendarIcon className="size-3.5" />
            {formatDate(post.date)}
          </span>
          <span>{post.category}</span>
          <ShareButton />
        </div>
      </div>

      <div className="post-content" dangerouslySetInnerHTML={{ __html: post.html }} />
    </article>
  );
}
