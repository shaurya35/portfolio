import type { Metadata } from "next";
import { writings } from "@/content/writing";
import { WritingList } from "@/components/writing-list";

export const metadata: Metadata = {
  title: "Writing",
  description: "Technical writing on what I've actually shipped.",
};

export default function WritingPage() {
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
