import type { Metadata } from "next";
import { projects } from "@/content/projects";
import { ProjectList } from "@/components/project-list";

export const metadata: Metadata = {
  title: "Projects",
  description: "A few products and experiments I've shipped.",
};

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
