import { achievements } from "@/content/achievements";
import { SectionHeading } from "@/components/section-heading";

export function Achievements() {
  return (
    <section className="py-8">
      <SectionHeading>Achievements</SectionHeading>
      <ul className="mt-4 flex flex-col gap-2">
        {achievements.map((achievement) => (
          <li
            key={achievement.title}
            className="flex items-start gap-2 text-sm text-muted-foreground"
          >
            <span className="flex h-5 w-4 shrink-0 items-center justify-center">
              <span className="size-1 rounded-full bg-muted-foreground" />
            </span>
            <p>
              {achievement.href ? (
                <a
                  href={achievement.href}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-foreground transition-colors hover:text-accent"
                >
                  {achievement.title}
                </a>
              ) : (
                <span className="font-medium text-foreground">
                  {achievement.title}
                </span>
              )}
              {achievement.note ? ` · ${achievement.note}` : null}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
