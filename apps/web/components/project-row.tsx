import type { Project } from "@/types/project";
import { ArrowUpRightIcon, GitHubIcon } from "@/components/icons";
import { ProjectThumb } from "@/components/project-thumb";
import { TrackedLink } from "@/components/tracked-link";

export function ProjectRow({ project }: { project: Project }) {
  const primaryHref = project.liveHref ?? project.githubHref!;
  const primaryTarget = `project:${project.slug}:${project.liveHref ? "live" : "github"}`;

  const actions = (
    <>
      {project.liveHref && (
        <TrackedLink
          trackTarget={`project:${project.slug}:live`}
          href={project.liveHref}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowUpRightIcon className="size-3.5" />
          Live
        </TrackedLink>
      )}
      {project.githubHref && (
        <TrackedLink
          trackTarget={`project:${project.slug}:github`}
          href={project.githubHref}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <GitHubIcon className="size-3.5" />
          Code
        </TrackedLink>
      )}
    </>
  );

  return (
    <article className="flex flex-col gap-2 py-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <div className="group flex min-w-0 flex-1 items-start gap-3">
        <TrackedLink
          trackTarget={primaryTarget}
          href={primaryHref}
          target="_blank"
          rel="noreferrer"
          className="shrink-0"
        >
          <ProjectThumb title={project.title} image={project.image} />
        </TrackedLink>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-baseline justify-between gap-3 sm:block">
            <TrackedLink
              trackTarget={primaryTarget}
              href={primaryHref}
              target="_blank"
              rel="noreferrer"
              className="text-lg leading-tight font-semibold transition-colors group-hover:text-accent"
            >
              {project.title}
            </TrackedLink>
            <div className="flex shrink-0 items-center gap-4 sm:hidden">
              {actions}
            </div>
          </div>
          <TrackedLink
            trackTarget={primaryTarget}
            href={primaryHref}
            target="_blank"
            rel="noreferrer"
            className="block"
          >
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {project.description}
            </p>
            <p className="text-xs text-muted-foreground">
              {project.tech.join(" · ")}
            </p>
          </TrackedLink>
        </div>
      </div>

      <div className="hidden shrink-0 items-center gap-4 sm:flex sm:self-start">
        {actions}
      </div>
    </article>
  );
}
