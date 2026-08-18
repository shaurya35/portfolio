import type { PostStatus } from "@/app/admin/_lib/api";

export function StatusBadge({ status }: { status: PostStatus }) {
  const isPublished = status === "published";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs ${
        isPublished
          ? "border-accent text-accent"
          : "border-border text-muted-foreground"
      }`}
    >
      {isPublished ? "Published" : "Draft"}
    </span>
  );
}
