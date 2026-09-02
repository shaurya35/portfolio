"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { AdminPost, PostSource, PostStatus } from "@/app/admin/_lib/api";
import { ApiRequestError } from "@/app/admin/_lib/api";
import { RichTextEditor } from "@/app/admin/_components/rich-text-editor";
import { useUnsavedChanges } from "@/lib/use-unsaved-changes";

export type PostFormValues = {
  slug: string;
  title: string;
  description: string;
  category: string;
  source: PostSource;
  url: string;
  markdown: string;
  status: PostStatus;
};

type PostFormProps = {
  initial?: AdminPost;
  submitLabel: string;
  onSubmit: (values: PostFormValues) => Promise<void>;
  /** Only known once a post has an id, so the new-post form has nothing to
   * link to yet — omitted there. */
  previewHref?: string;
};

const sources: { value: PostSource; label: string }[] = [
  { value: "native", label: "Native" },
  { value: "x", label: "X" },
  { value: "medium", label: "Medium" },
];

/**
 * Title -> URL slug.
 *
 * NFKD-normalising first means accented characters degrade to their base
 * letter ("Über" -> "uber") instead of being dropped entirely, which is what a
 * naive strip of non-ASCII would do. Anything still not a letter, digit or
 * hyphen collapses to a single hyphen, and leading/trailing hyphens are
 * trimmed so a title ending in punctuation does not yield "my-post-".
 */
function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function PostForm({ initial, submitLabel, onSubmit, previewHref }: PostFormProps) {
  const router = useRouter();
  const isEditing = initial !== undefined;

  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [source, setSource] = useState<PostSource>(initial?.source ?? "native");
  const [url, setUrl] = useState(initial?.url ?? "");
  const [markdown, setMarkdown] = useState(initial?.markdown ?? "");
  const [status, setStatus] = useState<PostStatus>(initial?.status ?? "draft");

  // A slug mirrors the title until the author touches it. After that it is
  // theirs and the title must never overwrite it — silently clobbering a
  // deliberate URL while someone edits the headline is the failure mode this
  // guards against. Existing posts start detached: their slug is already
  // fixed and the field is disabled anyway.
  const [slugTouched, setSlugTouched] = useState(isEditing);

  const [slugError, setSlugError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { setDirty, confirmNavigation } = useUnsavedChanges();

  // Compared against the values the form started with (empty for a new
  // post, `initial` for an edit) so navigating away only prompts when
  // something has actually changed — not on every render.
  const baseline = useRef({
    slug: initial?.slug ?? "",
    title: initial?.title ?? "",
    description: initial?.description ?? "",
    category: initial?.category ?? "",
    source: initial?.source ?? "native",
    url: initial?.url ?? "",
    markdown: initial?.markdown ?? "",
    status: initial?.status ?? "draft",
  });
  const dirtyRef = useRef(false);

  useEffect(() => {
    const current = { slug, title, description, category, source, url, markdown, status };
    const dirty = (Object.keys(current) as (keyof typeof current)[]).some(
      (key) => current[key] !== baseline.current[key],
    );
    dirtyRef.current = dirty;
    setDirty(dirty);
  }, [slug, title, description, category, source, url, markdown, status, setDirty]);

  // Clears the flag when the form itself goes away (route change after a
  // successful save, or unmount for any other reason) so a stale "dirty"
  // from this form doesn't block navigation on whatever page comes next.
  useEffect(() => {
    return () => setDirty(false);
  }, [setDirty]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (dirtyRef.current) {
        event.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  const handleCancel = () => {
    if (!confirmNavigation()) return;
    setDirty(false);
    router.push("/admin/posts");
  };

  // A plain <Link> here would skip Nav's capture-phase guard — that only
  // wraps the topbar — so this link checks the same confirmNavigation()
  // itself before letting the click through.
  const handlePreviewClick = (event: React.MouseEvent) => {
    if (!confirmNavigation()) {
      event.preventDefault();
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSlugError(null);
    setFormError(null);

    if (source === "native" && markdown.trim().length === 0) {
      setFormError("Write some content before saving.");
      return;
    }

    setSaving(true);

    try {
      await onSubmit({
        slug,
        title,
        description,
        category,
        source,
        url,
        markdown,
        status,
      });
      setDirty(false);
    } catch (err) {
      if (err instanceof ApiRequestError && err.status === 409) {
        setSlugError(err.message);
      } else if (err instanceof ApiRequestError) {
        setFormError(err.message);
      } else {
        setFormError("Something went wrong. Please try again.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="slug" className="text-sm text-muted-foreground">
          Slug
        </label>
        <input
          id="slug"
          value={slug}
          onChange={(event) => {
            // Sanitise on the way in, but preserve a trailing separator so
            // the field stays typeable. Both a space and a hyphen have to
            // count here: slugify trims trailing separators, so if only "-"
            // were kept, pressing space would be swallowed and "a b c" would
            // land as "abc".
            const raw = event.target.value;
            const trailing = /[\s-]$/.test(raw) ? "-" : "";
            const next = slugify(raw) + trailing;
            // Emptying the field is the escape hatch back to tracking the
            // title, so a mistaken edit is recoverable without a reload.
            setSlugTouched(next.length > 0);
            setSlug(next.length > 0 ? next : slugify(title));
          }}
          disabled={isEditing}
          placeholder="my-post-slug"
          className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent disabled:cursor-not-allowed disabled:opacity-60"
          required
        />
        <p className="text-xs text-muted-foreground">
          {isEditing
            ? "Slug cannot be changed after creation."
            : slugTouched
              ? "Custom slug. Clear it to follow the title again."
              : "Generated from the title. Edit it to set your own."}
        </p>
        {slugError ? (
          <p role="alert" className="text-sm text-destructive">
            {slugError}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="title" className="text-sm text-muted-foreground">
          Title
        </label>
        <input
          id="title"
          value={title}
          onChange={(event) => {
            const nextTitle = event.target.value;
            setTitle(nextTitle);
            if (!slugTouched) {
              setSlug(slugify(nextTitle));
            }
          }}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="description" className="text-sm text-muted-foreground">
          Description
        </label>
        <input
          id="description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="category" className="text-sm text-muted-foreground">
          Category
        </label>
        <input
          id="category"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm text-muted-foreground">Source</span>
        <div className="flex gap-2">
          {sources.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setSource(option.value)}
              className={`cursor-pointer rounded-md border px-3 py-1.5 text-sm transition-colors ${
                source === option.value
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {source === "native" ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-sm text-muted-foreground">Content</span>
          <RichTextEditor content={markdown} onChange={setMarkdown} />
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="url" className="text-sm text-muted-foreground">
            URL
          </label>
          <input
            id="url"
            type="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://…"
            className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
            required
          />
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <span className="text-sm text-muted-foreground">Status</span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setStatus("draft")}
            className={`cursor-pointer rounded-md border px-3 py-1.5 text-sm transition-colors ${
              status === "draft"
                ? "border-foreground bg-foreground text-background"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            Draft
          </button>
          <button
            type="button"
            onClick={() => setStatus("published")}
            className={`cursor-pointer rounded-md border px-3 py-1.5 text-sm transition-colors ${
              status === "published"
                ? "border-foreground bg-foreground text-background"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            Published
          </button>
        </div>
      </div>

      {formError ? (
        <p role="alert" className="text-sm text-destructive">
          {formError}
        </p>
      ) : null}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="cursor-pointer self-start rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Saving…" : submitLabel}
        </button>
        <button
          type="button"
          onClick={handleCancel}
          className="cursor-pointer self-start rounded-md border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          Cancel
        </button>
        {previewHref ? (
          <Link
            href={previewHref}
            onClick={handlePreviewClick}
            className="inline-flex cursor-pointer items-center self-start rounded-md border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Preview
          </Link>
        ) : null}
      </div>
    </form>
  );
}
