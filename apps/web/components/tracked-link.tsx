"use client";

import type { ComponentProps } from "react";
import { trackClick } from "@/lib/track-click";

/**
 * A plain `<a>` that also fires a click event — the one bit of interactivity
 * most of these link-hosting sections need, kept as its own client leaf so
 * footer/hero/project-row/contact can stay server components.
 */
export function TrackedLink({
  trackTarget,
  onClick,
  ...props
}: ComponentProps<"a"> & { trackTarget: string }) {
  return (
    <a
      {...props}
      onClick={(event) => {
        trackClick(trackTarget);
        onClick?.(event);
      }}
    />
  );
}
