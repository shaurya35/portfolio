import { experience } from "@/content/experience";
import { formatRange } from "@/lib/format";
import { SectionHeading } from "@/components/section-heading";

export function Experience() {
  return (
    <section className="py-8">
      <SectionHeading>Experience</SectionHeading>

      <ul className="mt-4 flex flex-col gap-4">
        {experience.map((job) => (
          <li
            key={`${job.company}-${job.start}`}
            className="flex flex-col justify-between gap-1 sm:flex-row sm:items-start sm:gap-3"
          >
            <div>
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
              <p className="text-sm text-muted-foreground">{job.role}</p>
            </div>
            <div className="text-right text-sm text-muted-foreground sm:shrink-0">
              <p>{formatRange(job.start, job.end)}</p>
              <p>
                {job.location} ({job.mode})
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
