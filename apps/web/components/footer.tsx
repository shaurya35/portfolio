import Link from "next/link";
import { site } from "@/content/site";
import { socials } from "@/content/socials";
import { socialIcons } from "@/components/icons";

const navigate = [
  { label: "Home", href: "/" },
  { label: "Projects", href: "/projects" },
  { label: "Blog", href: "/blog" },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-border bg-muted/30 text-sm">
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="flex flex-col gap-10 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
          <div className="flex flex-col gap-4">
            <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
              Navigate
            </p>
            <nav className="flex flex-wrap gap-x-6 gap-y-1">
              {navigate.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex flex-col gap-4">
            <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
              Connect
            </p>
            <div className="flex flex-wrap gap-2">
              {socials.map((social) => {
                const Icon = socialIcons[social.icon];
                return (
                  <a
                    key={social.name}
                    href={social.href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={social.name}
                    className="flex size-9 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <Icon className="size-5" />
                  </a>
                );
              })}
            </div>
          </div>
        </div>

        <p className="mt-8 text-xs text-muted-foreground">
          © {year} {site.name}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
