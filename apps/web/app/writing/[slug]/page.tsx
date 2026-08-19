import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPost, getPosts } from "@/lib/api";
import { formatDate, readingTime } from "@/lib/format";
import { ArrowLeftIcon, CalendarIcon } from "@/components/icons";
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
  const [post, posts] = await Promise.all([getNativePost(slug), getPosts()]);

  if (!post) {
    notFound();
  }

  const relatedPosts = posts
    .filter(
      (candidate) =>
        candidate.source === "native" &&
        candidate.slug !== post.slug &&
        candidate.category === post.category,
    )
    .slice(0, 3);

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
        <span className="inline-block rounded-md border border-border px-2 py-0.5 text-xs text-muted-foreground">
          {post.category}
        </span>
        <h1 className="mt-4 font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
          {post.title}
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">{post.description}</p>
        <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <CalendarIcon className="size-4" />
            {formatDate(post.date)}
          </span>
          <span>·</span>
          <span>{readingTime(post.html)}</span>
          <ShareButton />
        </div>
      </div>

      <div
        className="post-content pt-8"
        dangerouslySetInnerHTML={{ __html: post.html }}
      />

      {relatedPosts.length > 0 ? (
        <div className="mt-16 border-t border-border pt-8">
          <h2 className="font-serif text-xl font-semibold">More writing</h2>
          <ul className="mt-6 flex flex-col gap-6">
            {relatedPosts.map((related) => (
              <li key={related.slug}>
                <Link href={`/writing/${related.slug}`} className="group block">
                  <h3 className="font-medium transition-colors group-hover:text-accent">
                    {related.title}
                  </h3>
                  <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                    {related.description}
                  </p>
                  <span className="mt-2 inline-block text-xs text-muted-foreground">
                    {formatDate(related.date)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-16 border-t border-border pt-8 text-center">
        <Link
          href="/writing"
          className="inline-block rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          View all writing
        </Link>
      </div>
    </article>
  );
}
