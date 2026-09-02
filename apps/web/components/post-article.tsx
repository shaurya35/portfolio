import { formatDate, readingTime } from "@/lib/format";
import { CalendarIcon } from "@/components/icons";
import { ShareButton } from "@/components/share-button";
import { CodeBlockCopyButtons } from "@/components/code-copy-buttons";

export type PostArticleData = {
  title: string;
  description: string;
  category: string;
  /** ISO date string. Omitted for a draft that's never been published. */
  date?: string;
  html: string;
};

/**
 * The rendered body of a post — category pill, title, description, date,
 * reading time, and the post-content HTML itself. Shared by the public
 * `/writing/[slug]` page and the admin preview screen so a preview renders
 * through the exact same markup as production, not a lookalike of it.
 */
export function PostArticle({
  post,
  showShare = true,
}: {
  post: PostArticleData;
  showShare?: boolean;
}) {
  return (
    <>
      <div className="border-b border-border pb-8">
        <span className="inline-block rounded-md border border-border px-2 py-0.5 text-xs text-muted-foreground">
          {post.category}
        </span>
        <h1 className="mt-4 font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
          {post.title}
        </h1>
        <p className="mt-3 text-lg text-muted-foreground">{post.description}</p>
        <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
          {post.date ? (
            <>
              <span className="inline-flex items-center gap-1.5">
                <CalendarIcon className="size-4" />
                {formatDate(post.date)}
              </span>
              <span>·</span>
            </>
          ) : null}
          <span>{readingTime(post.html)}</span>
          {showShare ? <ShareButton /> : null}
        </div>
      </div>

      <div className="post-content pt-8" dangerouslySetInnerHTML={{ __html: post.html }} />
      <CodeBlockCopyButtons />
    </>
  );
}
