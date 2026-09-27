import type { Metadata } from "next";
import { projects } from "@/content/projects";
import { ProjectList } from "@/components/project-list";
import { pageMetadata } from "@/lib/metadata";

// See app/writing/page.tsx: title/description alone inherits the whole
// root-layout openGraph object (including og:url), so this builds its own.
export const metadata: Metadata = pageMetadata({
  title: "Projects",
  description: "A few products and experiments I've shipped.",
  path: "/projects",
});

export default function ProjectsPage() {
  return (
    <section className="py-8">
      <div className="pb-8">
        <h1 className="text-2xl font-bold">Projects</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A few products and experiments I&apos;ve shipped.
        </p>
      </div>

      <ProjectList projects={projects} />
    </section>
  );
}
