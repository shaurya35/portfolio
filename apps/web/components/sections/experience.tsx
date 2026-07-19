import { experience } from "@/content/experience";
import { formatRange } from "@/lib/format";
import { SectionHeading } from "@/components/section-heading";

export function Experience() {
  return (
    <section className="py-8">
      <SectionHeading>Experience</SectionHeading>

      <ul className="mt-4 flex flex-col gap-4">
        {experience.map((job) => (
          <li key={`${job.company}-${job.start}`} className="flex flex-col">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
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
              </div>
              <p className="shrink-0 text-sm text-muted-foreground">
                {formatRange(job.start, job.end)}
              </p>
            </div>
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <p className="text-sm text-muted-foreground">{job.role}</p>
              <p className="shrink-0 text-sm text-muted-foreground">
                {job.location} ({job.mode})
              </p>
            </div>
            <div className="mt-1 flex items-start gap-2 text-sm text-muted-foreground">
              <span className="flex h-5 w-4 shrink-0 items-center justify-center">
                <span className="size-1 rounded-full bg-muted-foreground" />
              </span>
              <p>{job.highlight}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
