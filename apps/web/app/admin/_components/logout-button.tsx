"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { logout } from "@/app/admin/_lib/api";

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
      className="cursor-pointer rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
    >
      {loading ? "Logging out…" : "Log out"}
    </button>
  );
}
