import Link from "next/link";
import { blogPosts } from "@/content/blog";
import { formatDate } from "@/lib/format";
import { SectionHeading } from "@/components/section-heading";

export function Blog() {
  return (
    <section className="py-8">
      <SectionHeading>Blog</SectionHeading>

      <ul className="mt-4 flex flex-col gap-6">
        {blogPosts.slice(0, 3).map((post) => (
          <li key={post.slug}>
            <a
              href={post.href}
              target="_blank"
              rel="noreferrer"
              className="group flex items-center justify-between gap-4"
            >
              <div className="min-w-0">
                <h3 className="font-medium transition-colors group-hover:text-accent">
                  {post.title}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">{post.description}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {formatDate(post.date)}
                </p>
              </div>
              <span className="shrink-0 text-sm text-muted-foreground transition-colors group-hover:text-accent">
                →
              </span>
            </a>
          </li>
        ))}
      </ul>

      <Link
        href="/blog"
        className="mt-6 inline-block rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        Show all blogs
      </Link>
    </section>
  );
}
