"use client";

import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

/** True for the admin's own pages: the site owner, not a visitor — the same
 * rule components/beacon.tsx applies to the site's own stats. */
function isAdminUrl(url: string): boolean {
  try {
    return new URL(url).pathname.startsWith("/admin");
  } catch {
    return false;
  }
}

/**
 * Vercel Web Analytics and Speed Insights, minus /admin. A client component
 * only because beforeSend is a function, which the server-rendered root
 * layout can't pass as a prop.
 */
export function VercelInsights() {
  return (
    <>
      <Analytics beforeSend={(event) => (isAdminUrl(event.url) ? null : event)} />
      <SpeedInsights beforeSend={(event) => (isAdminUrl(event.url) ? null : event)} />
    </>
  );
}
