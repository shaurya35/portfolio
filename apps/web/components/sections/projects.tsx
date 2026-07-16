import Link from "next/link";
import { projects } from "@/content/projects";
import { SectionHeading } from "@/components/section-heading";
import { ProjectRow } from "@/components/project-row";

export function Projects() {
  return (
    <section className="py-8">
      <SectionHeading>Projects</SectionHeading>

      <div className="mt-4 divide-y divide-border">
        {projects.slice(0, 3).map((project) => (
          <ProjectRow key={project.slug} project={project} />
        ))}
      </div>

      <Link
        href="/projects"
        className="mt-6 inline-block rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        Show all projects
      </Link>
    </section>
  );
}
