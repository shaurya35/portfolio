// Same transport as components/beacon.tsx's pageview ping: sendBeacon so it
// survives the page navigating away right after the click (the whole point
// of tracking an outbound link), and a bare try/catch since a dropped click
// event should never be visible to the visitor.
import { SITE_URL } from "@/content/site";

const RUST_API_URL = process.env.NEXT_PUBLIC_RUST_API_URL;

/** Local dev and Vercel preview deployments talk to the same backend (and,
 * locally, often the production database), so without this every test click
 * and page load landed in the real stats. */
export function isProductionSite(): boolean {
  return window.location.origin === SITE_URL;
}

export function trackClick(target: string) {
  if (!RUST_API_URL || !isProductionSite()) return;
  try {
    const body = JSON.stringify({
      kind: "click",
      path: window.location.pathname,
      target,
    });
    navigator.sendBeacon(`${RUST_API_URL}/e`, new Blob([body], { type: "application/json" }));
  } catch {
    // Analytics is best-effort; never let it break the actual click.
  }
}
