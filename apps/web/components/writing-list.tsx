"use client";

import { useState } from "react";
import type { Writing } from "@/types/writing";
import { formatDate } from "@/lib/format";
import {
  CalendarIcon,
  ArrowRightIcon,
  XIcon,
  MediumIcon,
} from "@/components/icons";

const PAGE_SIZE = 10;

const sourceIcons = {
  x: XIcon,
  medium: MediumIcon,
};

export function WritingList({ writings }: { writings: Writing[] }) {
  const [visible, setVisible] = useState(PAGE_SIZE);
  const shown = writings.slice(0, visible);
  const remaining = writings.length - shown.length;

  return (
    <div>
      <div className="divide-y divide-border">
        {shown.map((post) => {
          const SourceIcon = sourceIcons[post.source];
          return (
            <article key={post.slug} className="group py-4">
              <a
                href={post.href}
                target="_blank"
                rel="noreferrer"
                className="block"
              >
                <h3 className="text-lg leading-tight font-semibold transition-colors group-hover:text-accent">
                  {post.title}
                </h3>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  {post.description}
                </p>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <SourceIcon className="size-3" />
                      {post.category}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <CalendarIcon className="size-3.5" />
                      {formatDate(post.date)}
                    </span>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1.5 text-sm text-muted-foreground transition-colors group-hover:text-accent">
                    Read more
                    <ArrowRightIcon className="size-4" />
                  </span>
                </div>
              </a>
            </article>
          );
        })}
      </div>

      {remaining > 0 && (
        <button
          type="button"
          onClick={() => setVisible((v) => v + PAGE_SIZE)}
          className="mt-6 inline-block rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          Show more ({remaining})
        </button>
      )}
    </div>
  );
}
