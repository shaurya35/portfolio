"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const RUST_API_URL = process.env.NEXT_PUBLIC_RUST_API_URL;

export function Beacon() {
  const pathname = usePathname();

  useEffect(() => {
    if (!RUST_API_URL) return;
    try {
      const body = JSON.stringify({ kind: "pageview", path: pathname });
      navigator.sendBeacon(`${RUST_API_URL}/e`, new Blob([body], { type: "application/json" }));
    } catch {
      return;
    }
  }, [pathname]);

  return null;
}
