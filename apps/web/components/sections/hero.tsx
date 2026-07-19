import Image from "next/image";
import { site } from "@/content/site";
import { socials } from "@/content/socials";
import { socialIcons } from "@/components/icons";
import { CopyEmail } from "@/components/copy-email";

export function Hero() {
  return (
    <section className="py-4">
      <div className="flex items-center gap-4">
        <Image
          src="/Self.jpeg"
          alt={site.name}
          width={96}
          height={96}
          priority
          className="size-24 shrink-0 rounded-full object-cover"
        />
        <div>
          <h1 className="text-lg font-bold whitespace-nowrap sm:text-2xl">
            {site.name}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-1 gap-y-1 text-base text-muted-foreground">
            <span>
              {site.role} · {site.email}
            </span>
            <CopyEmail email={site.email} />
          </div>
        </div>
      </div>

      <p className="mt-4 max-w-xl text-sm text-muted-foreground">{site.credibility}</p>

      <div className="mt-4 flex flex-wrap gap-0.5">
        {socials.map((social) => {
          const Icon = socialIcons[social.icon];
          return (
            <a
              key={social.name}
              href={social.href}
              target="_blank"
              rel="noreferrer"
              aria-label={social.name}
              className="flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground"
            >
              <span className="size-6">
                <Icon className="size-5" />
              </span>
            </a>
          );
        })}
      </div>
    </section>
  );
}
