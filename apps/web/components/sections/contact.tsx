import { site } from "@/content/site";
import { socials } from "@/content/socials";
import { SectionHeading } from "@/components/section-heading";
import { MailIcon, CalendarIcon } from "@/components/icons";

export function Contact() {
  const emailHref = socials.find((social) => social.name === "Email")!.href;

  return (
    <section className="py-8">
      <SectionHeading>Let&apos;s talk</SectionHeading>
      <p className="mt-4 max-w-xl text-sm text-muted-foreground">
        Open to interesting problems, collaborations, or just talking shop.
      </p>

      <div className="mt-4 flex flex-wrap gap-3">
        <a
          href={site.calHref}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-md bg-foreground px-3 py-1.5 text-sm text-background transition-opacity hover:opacity-90"
        >
          <CalendarIcon className="size-4" />
          Book a call
        </a>
        <a
          href={emailHref}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <MailIcon className="size-4" />
          Email me
        </a>
      </div>
    </section>
  );
}
