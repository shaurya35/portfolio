import type { Metadata } from "next";
import { getPosts } from "@/lib/api";
import { WritingList } from "@/components/writing-list";
import { pageMetadata } from "@/lib/metadata";

// Was `{ title, description }` only, which meant this page inherited the
// whole root-layout openGraph object (including its og:url) instead of its
// own — shared /writing links rendered a homepage card. pageMetadata()
// builds a complete, page-specific object instead.
export const metadata: Metadata = pageMetadata({
  title: "Writing",
  description: "Technical writing on what I've actually shipped.",
  path: "/writing",
});

export default async function WritingPage() {
  const writings = await getPosts();

  return (
    <section className="py-8">
      <div className="pb-8">
        <h1 className="text-2xl font-bold">Writing</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Technical writing on what I&apos;ve actually shipped.
        </p>
      </div>

      <WritingList writings={writings} />
    </section>
  );
}
