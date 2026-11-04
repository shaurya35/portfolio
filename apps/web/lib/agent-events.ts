// Server side only: reports a fetch of /llms.txt to rust-be's /agent-events
// (apps/rust-be/src/routes/agent_events.rs). The page beacon can't do this:
// an agent reading a text file runs no script, and /e drops bots on purpose.
//
// Authenticated with REVALIDATE_SECRET, which web and rust-be already share
// for the revalidate webhook. If the two values ever differ, rust-be answers
// 401 and the error below shows up in this project's Vercel logs.
import { agentName } from "@/lib/agent-name";

const TIMEOUT_MS = 3000;

/** Previews and local dev share the production backend (see
 * lib/track-click.ts), so only a production build outside a preview
 * deployment reports. */
function shouldReport(): boolean {
  return process.env.NODE_ENV === "production" && process.env.VERCEL_ENV !== "preview";
}

export async function recordAgentFetch({
  path,
  userAgent,
  country,
}: {
  path: string;
  userAgent: string | null;
  country: string | null;
}): Promise<void> {
  const base = process.env.RUST_API_URL?.replace(/\/+$/, "");
  const secret = process.env.REVALIDATE_SECRET;
  if (!base || !secret || !shouldReport()) return;

  try {
    const response = await fetch(`${base}/agent-events`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Internal-Secret": secret },
      body: JSON.stringify({ path, agent: agentName(userAgent), country }),
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) {
      console.error(`agent event for ${path} rejected: ${response.status}`);
    }
  } catch (error) {
    // Analytics is best-effort; the file has already been served.
    console.error(`agent event for ${path} failed:`, error);
  }
}
