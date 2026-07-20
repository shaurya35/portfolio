"use client";

import { useMemo, useState } from "react";
import type { Project } from "@/types/project";
import { ProjectRow } from "@/components/project-row";

const PAGE_SIZE = 10;

export function ProjectList({ projects }: { projects: Project[] }) {
  const [tech, setTech] = useState<string | null>(null);
  const [visible, setVisible] = useState(PAGE_SIZE);

  const techs = useMemo(() => {
    const counts = new Map<string, number>();
    for (const project of projects) {
      for (const t of project.tech) {
        counts.set(t, (counts.get(t) ?? 0) + 1);
      }
    }
    return Array.from(counts.entries()).sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
    );
  }, [projects]);

  const filtered = tech
    ? projects.filter((project) => project.tech.includes(tech))
    : projects;
  const shown = filtered.slice(0, visible);
  const remaining = filtered.length - shown.length;

  function selectTech(next: string | null) {
    setTech(next);
    setVisible(PAGE_SIZE);
  }

  return (
    <div>
      <div className="scrollbar-none flex gap-1.5 overflow-x-auto pb-1">
        <FilterPill
          label="All"
          count={projects.length}
          active={tech === null}
          onClick={() => selectTech(null)}
        />
        {techs.map(([t, count]) => (
          <FilterPill
            key={t}
            label={t}
            count={count}
            active={tech === t}
            onClick={() => selectTech(t)}
          />
        ))}
      </div>

      <div className="mt-6 divide-y divide-border">
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

function FilterPill({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs transition-colors ${
        active
          ? "bg-foreground text-background"
          : "bg-muted text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
      <span
        className={`rounded-full px-1.5 py-px text-[10px] ${
          active ? "bg-background/20" : "bg-background"
        }`}
      >
        {count}
      </span>
    </button>
  );
}
