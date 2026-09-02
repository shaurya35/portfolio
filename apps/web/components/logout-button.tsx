"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { logout } from "@/app/admin/_lib/api";
import { LogoutIcon } from "@/components/icons";

/**
 * A small bordered icon button, matching the theme toggle's box next to it,
 * instead of a plain text link — the hover tint leans toward destructive
 * (a muted red) since logging out is an exit action, distinct from every
 * other neutral-hover control in the topbar.
 */
export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await logout();
    } catch {
      // The cookie is server-invalidated either way; route back to login regardless.
    } finally {
      router.push("/admin");
    }
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      aria-label={loading ? "Logging out…" : "Log out"}
      title={loading ? "Logging out…" : "Log out"}
      className="flex size-7 cursor-pointer items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:border-destructive/40 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-50"
    >
      <LogoutIcon className={`size-4 ${loading ? "animate-pulse" : ""}`} />
    </button>
  );
}
