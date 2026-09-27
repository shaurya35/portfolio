import { notFound } from "next/navigation";
import { getNativePost } from "@/lib/api";

// Existence check for real 404s. The sibling loading.tsx wraps page.tsx in a
// Suspense boundary, and once that fallback streams the status is locked at
// 200 — so the page's own notFound() for a draft or unknown slug used to
// return HTTP 200 with the not-found UI (plus a noindex meta). A layout sits
// outside its segment's loading boundary, so notFound() here runs before
// streaming starts and returns a real 404, while the page keeps its skeleton.
// getNativePost is the same tagged, cached fetch the page makes, so this
// adds no extra backend request.
export default async function PostLayout({
  children,
  params,
}: LayoutProps<"/writing/[slug]">) {
  const { slug } = await params;
  if (!(await getNativePost(slug))) {
    notFound();
  }
  return children;
}
