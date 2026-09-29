"use client";

import { useId, useState } from "react";
import Image from "next/image";
import type { Experience } from "@/types/experience";
import { tech as techRegistry, type TechKey } from "@/content/tech";
import { formatRange } from "@/lib/format";
import { CaretDownIcon, CaretRightIcon } from "@/components/icons";

export function ExperienceItem({ job }: { job: Experience }) {
  const [open, setOpen] = useState(false);
  const contentId = useId();
  const expandable = Boolean(job.tech?.length || job.highlights?.length);

  return (
    <div>
      <div className="group/card flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={job.companyHref}
              target="_blank"
              rel="noreferrer"
              className="text-lg font-bold transition-colors hover:text-accent"
            >
              {job.company}
            </a>
            {job.end === null && (
              <span className="flex items-center gap-1 rounded-md bg-green-500/10 px-2 py-1 text-xs">
                <span className="size-2 animate-pulse rounded-full bg-green-500" />
                Working
              </span>
            )}
            {expandable && (
              <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                aria-expanded={open}
                aria-controls={contentId}
                aria-label={open ? "Collapse details" : "Expand details"}
                // Hidden until the row is hovered, like the rest of the row's
                // chrome, but only where hover exists: a touch screen would
                // otherwise never show it.
                className={`flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-opacity hover:bg-muted hover:text-foreground focus-visible:opacity-100 aria-expanded:bg-muted aria-expanded:text-foreground ${
                  open
                    ? "opacity-100"
                    : "[@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover/card:opacity-100"
                }`}
              >
                {open ? (
                  <CaretDownIcon className="size-4" />
                ) : (
                  <CaretRightIcon className="size-4" />
                )}
              </button>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{job.role}</p>
        </div>
        <div className="flex shrink-0 flex-col text-right text-sm text-muted-foreground">
          <p>{formatRange(job.start, job.end)}</p>
          <p>
            <span className="sm:hidden">{job.location}</span>
            <span className="hidden sm:inline">
              {job.location} ({job.mode})
            </span>
          </p>
        </div>
      </div>

      {expandable && (
        <div
          id={contentId}
          inert={!open}
          className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
            open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="overflow-hidden">
            <div className="mt-2 space-y-3 border-t border-border pt-3">
              {/* {job.tech && job.tech.length > 0 && (
                <div>
                  <h4 className="mb-2 text-sm font-semibold">Technologies &amp; Tools</h4>
                  <ul className="flex flex-wrap gap-2">
                    {job.tech.map((key) => (
                      <li key={key}>
                        <TechBadge techKey={key} />
                      </li>
                    ))}
                  </ul>
                </div>
              )} */}
              {job.highlights && job.highlights.length > 0 && (
                <div>
                  <h4 className="mb-2 text-sm font-semibold">What I&apos;ve done</h4>
                  <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
                    {job.highlights.map((line) => (
                      <li key={line} className="flex gap-2">
                        <span aria-hidden="true">•</span>
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Logo-only tile whose name slides out on hover or keyboard focus. */
function TechBadge({ techKey }: { techKey: TechKey }) {
  const entry: { label: string; invertInDark?: boolean } = techRegistry[techKey];

  return (
    <span
      tabIndex={0}
      className="group inline-flex cursor-pointer items-center gap-0 rounded-md border border-dashed border-border bg-muted/50 px-2 py-1 text-sm font-medium text-foreground transition-all duration-300 ease-out hover:scale-[1.03] hover:gap-1.5 hover:bg-muted hover:shadow-sm hover:delay-150 focus-visible:gap-1.5"
    >
      <Image
        src={`/tech/${techKey}.svg`}
        alt=""
        width={16}
        height={16}
        unoptimized
        className={`size-4 shrink-0 ${entry.invertInDark ? "dark:invert" : ""}`}
      />
      <span className="max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-300 ease-out group-hover:max-w-32 group-hover:opacity-100 group-hover:delay-150 group-focus-visible:max-w-32 group-focus-visible:opacity-100">
        {entry.label}
      </span>
    </span>
  );
}
