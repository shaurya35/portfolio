"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { isProductionSite } from "@/lib/track-click";

const RUST_API_URL = process.env.NEXT_PUBLIC_RUST_API_URL;

// document.referrer describes how this page load began, and it keeps saying
// so through every client-side navigation after it — so it's reported with
// the first pageview only, or one visit from Google would count as Google
// referring every page the visitor clicked through to.
let referrerReported = false;

/** The external site this visit came from, as a bare hostname, or null for
 * direct traffic and links within this site. Sent in the body because the
 * beacon request's own Referer header is always this page, not the visit's
 * source. */
function externalReferrer(): string | null {
  if (referrerReported) return null;
  referrerReported = true;
  try {
    const { hostname } = new URL(document.referrer);
    return hostname && hostname !== window.location.hostname ? hostname : null;
  } catch {
    return null;
  }
}

export function Beacon() {
  const pathname = usePathname();

  useEffect(() => {
    // The admin is the site owner, not a visitor.
    if (!RUST_API_URL || pathname.startsWith("/admin") || !isProductionSite()) return;
    try {
      const referrer = externalReferrer();
      const body = JSON.stringify({
        kind: "pageview",
        path: pathname,
        ...(referrer ? { referrer } : {}),
      });
      navigator.sendBeacon(`${RUST_API_URL}/e`, new Blob([body], { type: "application/json" }));
    } catch {
      return;
    }
  }, [pathname]);

  return null;
}
