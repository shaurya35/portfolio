"use server";

import { updateTag } from "next/cache";
import { getPosts, getPostsLive, POSTS_TAG } from "@/lib/api";
import type { Writing } from "@/types/writing";

// A save that fails to refresh (network blip, cold-start timeout) and is
// retried a minute later could find the cache already refilled from the
// backend on its own, making the comparison below look clean while pages
// are still stale. Treating any very recent public write as a change covers
// that retry for publishes and edits.
const RECENT_WRITE_MS = 5 * 60 * 1000;

// Only what a public page renders from the list changes this: publishing,
// unpublishing, deleting, or editing a published post (rust-be bumps
// updated_at on every save). Draft-only saves leave it identical.
function fingerprint(posts: Writing[]): string {
  return JSON.stringify(
    posts.map((post) => [post.slug, post.updatedAt ?? post.date]).sort(),
  );
}

/**
 * Called by the admin after every create/update/delete so a publish shows
 * up on the very next visit to /, /writing, the post's page and the sitemap
 * — everything reading the "posts" tag — instead of relying on rust-be's
 * revalidate webhook, whose refresh silently never took effect in
 * production.
 *
 * The admin session cookie belongs to rust-be's domain, so this can't check
 * who is calling. It doesn't need to: it only expires the cache when the
 * backend's public data differs from what the site is serving, or within a
 * few minutes of a real public write — exactly when a refresh is correct.
 * Otherwise a call costs one backend read and changes nothing, so it can't
 * be used to keep forcing rebuilds.
 */
export async function syncPublicPages(): Promise<{ refreshed: boolean }> {
  const [live, cached] = await Promise.all([getPostsLive(), getPosts()]);

  const now = Date.now();
  const changed = fingerprint(live) !== fingerprint(cached);
  const recentWrite = live.some(
    (post) => now - Date.parse(post.updatedAt ?? post.date) < RECENT_WRITE_MS,
  );

  if (!changed && !recentWrite) {
    return { refreshed: false };
  }

  updateTag(POSTS_TAG);
  return { refreshed: true };
}
