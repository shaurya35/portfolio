"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * The year as of the visit, not the build. /projects, the admin pages and
 * the 404 page are fully static, so a year rendered on the server stays
 * whatever it was at deploy time: a build from late December kept showing
 * last year's © until the next deploy. Hydration uses `serverYear` (what
 * the static HTML already says), then React re-renders with the visitor's.
 */
export function CurrentYear({ serverYear }: { serverYear: number }) {
  return useSyncExternalStore(
    subscribe,
    () => new Date().getFullYear(),
    () => serverYear,
  );
}
