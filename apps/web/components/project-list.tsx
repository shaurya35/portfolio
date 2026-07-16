"use client";

import { useState } from "react";
import type { Project } from "@/types/project";
import { ProjectRow } from "@/components/project-row";

const PAGE_SIZE = 10;

export function ProjectList({ projects }: { projects: Project[] }) {
  const [visible, setVisible] = useState(PAGE_SIZE);
  const shown = projects.slice(0, visible);
  const remaining = projects.length - shown.length;

  return (
    <div>
      <div className="divide-y divide-border">
        {shown.map((project) => (
          <ProjectRow key={project.slug} project={project} />
        ))}
      </div>

      {remaining > 0 && (
        <button
          type="button"
          onClick={() => setVisible((v) => v + PAGE_SIZE)}
          className="mt-6 inline-block rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          Show more ({remaining})
        </button>
      )}
    </div>
  );
}
