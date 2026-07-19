import Link from "next/link";
import { writings } from "@/content/writing";
import { formatDate } from "@/lib/format";
import { SectionHeading } from "@/components/section-heading";
import { CalendarIcon, ArrowRightIcon } from "@/components/icons";

export function Writing() {
  return (
    <section className="py-8">
      <SectionHeading>Writing</SectionHeading>

      <ul className="mt-4 flex flex-col gap-6">
        {writings.slice(0, 3).map((post) => (
          <li key={post.slug}>
            <a
              href={post.href}
              target="_blank"
              rel="noreferrer"
              className="group block"
            >
              <h3 className="font-medium transition-colors group-hover:text-accent">
                {post.title}
              </h3>
              <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                {post.description}
              </p>
              <div className="mt-2 flex items-center justify-between gap-4">
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <CalendarIcon className="size-3.5" />
                  {formatDate(post.date)}
                </span>
                <span className="inline-flex shrink-0 items-center gap-1.5 text-sm text-muted-foreground transition-colors group-hover:text-accent">
                  Read more
                  <ArrowRightIcon className="size-4" />
                </span>
              </div>
            </a>
          </li>
        ))}
      </ul>

      <Link
        href="/writing"
        className="mt-6 inline-block rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        Show all writing
      </Link>
    </section>
  );
}
