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

/** Posts one analytics event to rust-be. The body is JSON, but it goes out
 * as text/plain: a JSON Content-Type isn't CORS-safelisted, so the browser
 * sent an OPTIONS preflight ahead of every beacon — two backend invocations
 * per event. rust-be's /e reads the body regardless of its Content-Type. */
export function sendEvent(event: Record<string, unknown>) {
  navigator.sendBeacon(
    `${RUST_API_URL}/e`,
    new Blob([JSON.stringify(event)], { type: "text/plain" }),
  );
}

export function trackClick(target: string) {
  if (!RUST_API_URL || !isProductionSite()) return;
  try {
    sendEvent({ kind: "click", path: window.location.pathname, target });
  } catch {
    // Analytics is best-effort; never let it break the actual click.
  }
}
