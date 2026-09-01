"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { LogoutButton } from "@/components/logout-button";
import { useUnsavedChanges } from "@/lib/use-unsaved-changes";

const PUBLIC_LINKS = [
  { label: "Home", href: "/" },
  { label: "Projects", href: "/projects" },
  { label: "Writing", href: "/writing" },
];

const ADMIN_LINKS = [
  { label: "Posts", href: "/admin/posts" },
  { label: "Stats", href: "/admin/stats" },
];

/**
 * The same topbar everywhere — logged into admin or not. Rather than admin
 * pages growing their own separate nav row, this swaps Home/Projects/Writing
 * for Posts/Stats (plus a logout button) whenever the pathname is under
 * `/admin` and past the login page itself, which has no session yet and
 * nothing admin-specific to show.
 */
export function Nav() {
  const pathname = usePathname();
  const { confirmNavigation } = useUnsavedChanges();
  const isAdminArea = pathname.startsWith("/admin") && pathname !== "/admin";
  const links = isAdminArea ? ADMIN_LINKS : PUBLIC_LINKS;

  // One interception point for the whole topbar instead of teaching each
  // target about unsaved changes: a capture-phase handler runs before a
  // clicked Link's own handler, and preventDefault here makes Link bail out
  // of navigating (it checks event.defaultPrevented). stopPropagation also
  // keeps LogoutButton's own onClick from firing. Only wired up in the admin
  // area — there's nothing to guard against on the public pages.
  const guardNavigation = (event: React.MouseEvent) => {
    if (!confirmNavigation()) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  return (
    <header
      onClickCapture={isAdminArea ? guardNavigation : undefined}
      className="mx-auto flex w-full max-w-2xl items-center justify-between px-4 py-6"
    >
      <nav className="flex items-center gap-6 text-sm text-muted-foreground">
        {links.map((link) => {
          const active =
            link.href === "/"
              ? pathname === "/"
              : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={`inline-flex min-h-11 items-center transition-colors hover:text-foreground ${active ? "text-foreground" : ""}`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
      <div className="flex items-center gap-3">
        {isAdminArea ? <LogoutButton /> : null}
        <ThemeToggle />
      </div>
    </header>
  );
}
