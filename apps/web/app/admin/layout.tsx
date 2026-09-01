"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/app/admin/_components/logout-button";

const TABS = [
  { label: "Posts", href: "/admin/posts" },
  { label: "Stats", href: "/admin/stats" },
] as const;

/**
 * Shared chrome for every logged-in admin page: a Posts/Stats tab bar plus
 * a Logout button that's always in the same place, instead of each page
 * rolling its own header (some pages had it, some didn't). The bare login
 * page (`/admin` itself, pre-auth) opts out — there's nothing to tab
 * between yet, and no session to log out of.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/admin") {
    return children;
  }

  return (
    <div className="pt-8">
      <div className="flex items-center justify-between border-b border-border">
        <nav className="flex gap-6">
          {TABS.map((tab) => {
            const active = pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`border-b-2 pb-3 text-sm font-medium transition-colors ${
                  active
                    ? "border-foreground text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
        <div className="pb-3">
          <LogoutButton />
        </div>
      </div>
      {children}
    </div>
  );
}
