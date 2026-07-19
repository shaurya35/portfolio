import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

const links = [
  { label: "Home", href: "/" },
  { label: "Projects", href: "/projects" },
  { label: "Writing", href: "/writing" },
];

export function Nav() {
  return (
    <header className="mx-auto flex w-full max-w-2xl items-center justify-between px-4 py-6">
      <nav className="flex items-center gap-6 text-sm text-muted-foreground">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="transition-colors hover:text-foreground"
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <ThemeToggle />
    </header>
  );
}
