import type { PostStatus } from "@/app/admin/_lib/api";

/**
 * Plain text, no dot and no pill. Two earlier attempts added ornament — an
 * accent-coloured chip, then a small dot — and both drew more attention than a
 * single bit of state deserves in a list row. Published is the resting state so
 * it recedes into the metadata line; Draft is the exception worth spotting, so
 * it alone gets full-strength ink.
 */
export function StatusBadge({ status }: { status: PostStatus }) {
  const isPublished = status === "published";

  return (
    <span
      className={`shrink-0 ${isPublished ? "text-muted-foreground" : "font-medium text-foreground"}`}
    >
      {isPublished ? "Published" : "Draft"}
    </span>
  );
}
