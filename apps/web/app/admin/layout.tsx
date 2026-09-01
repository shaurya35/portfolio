"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoutButton } from "@/app/admin/_components/logout-button";
import { ToastProvider } from "@/app/admin/_components/toast";
import {
  UnsavedChangesProvider,
  useUnsavedChanges,
} from "@/app/admin/_lib/use-unsaved-changes";

const TABS = [
  { label: "Posts", href: "/admin/posts" },
  { label: "Stats", href: "/admin/stats" },
] as const;

function AdminChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { confirmNavigation } = useUnsavedChanges();

  // One interception point for the whole nav row (tabs + logout) instead of
  // teaching each target about unsaved changes: a capture-phase handler runs
  // before Link's own click handler, and calling preventDefault here makes
  // Link bail out of its navigation (it checks event.defaultPrevented).
  // stopPropagation also keeps LogoutButton's own onClick from firing.
  const guardNavigation = (event: React.MouseEvent) => {
    if (!confirmNavigation()) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  return (
    <div className="pt-8">
      <div
        onClickCapture={guardNavigation}
        className="flex flex-wrap items-center justify-between gap-2 border-b border-border"
      >
        <nav className="flex gap-4 sm:gap-6">
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

/**
 * Shared chrome for every logged-in admin page: a Posts/Stats tab bar plus
 * a Logout button that's always in the same place, instead of each page
 * rolling its own header (some pages had it, some didn't). The bare login
 * page (`/admin` itself, pre-auth) opts out — there's nothing to tab
 * between yet, and no session to log out of.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <ToastProvider>
      <UnsavedChangesProvider>
        {pathname === "/admin" ? children : <AdminChrome>{children}</AdminChrome>}
      </UnsavedChangesProvider>
    </ToastProvider>
  );
}
