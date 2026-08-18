"use client";

import { useState } from "react";
import type { AdminPost, PostSource, PostStatus } from "@/app/admin/_lib/api";
import { ApiRequestError } from "@/app/admin/_lib/api";

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
};

const sources: { value: PostSource; label: string }[] = [
  { value: "native", label: "Native" },
  { value: "x", label: "X" },
  { value: "medium", label: "Medium" },
];

export function PostForm({ initial, submitLabel, onSubmit }: PostFormProps) {
  const isEditing = initial !== undefined;

  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [source, setSource] = useState<PostSource>(initial?.source ?? "native");
  const [url, setUrl] = useState(initial?.url ?? "");
  const [markdown, setMarkdown] = useState(initial?.markdown ?? "");
  const [status, setStatus] = useState<PostStatus>(initial?.status ?? "draft");

  const [slugError, setSlugError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSlugError(null);
    setFormError(null);
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
          onChange={(event) => setSlug(event.target.value)}
          disabled={isEditing}
          placeholder="my-post-slug"
          className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent disabled:cursor-not-allowed disabled:opacity-60"
          required
        />
        {isEditing ? (
          <p className="text-xs text-muted-foreground">
            Slug cannot be changed after creation.
          </p>
        ) : null}
        {slugError ? (
          <p role="alert" className="text-sm text-red-500">
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
          onChange={(event) => setTitle(event.target.value)}
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
                  ? "border-accent text-accent"
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
          <label htmlFor="markdown" className="text-sm text-muted-foreground">
            Markdown
          </label>
          <textarea
            id="markdown"
            value={markdown}
            onChange={(event) => setMarkdown(event.target.value)}
            rows={16}
            className="rounded-md border border-border bg-background px-3 py-2 font-mono text-sm outline-none focus:border-accent"
            required
          />
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
                ? "border-accent text-accent"
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
                ? "border-accent text-accent"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            Published
          </button>
        </div>
      </div>

      {formError ? (
        <p role="alert" className="text-sm text-red-500">
          {formError}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={saving}
        className="cursor-pointer self-start rounded-md bg-accent px-4 py-2 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
