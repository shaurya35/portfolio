import { experience } from "@/content/experience";
import { SectionHeading } from "@/components/section-heading";
import { ExperienceItem } from "@/components/experience-item";

export function Experience() {
  return (
    <section className="py-8">
      <SectionHeading>Experience</SectionHeading>

      <ul className="mt-4 flex flex-col gap-4">
        {experience.map((job) => (
          <li key={`${job.company}-${job.start}`}>
            <ExperienceItem job={job} />
          </li>
        ))}
      </ul>
    </section>
  );
}
