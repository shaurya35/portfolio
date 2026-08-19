"use client";

import { useState } from "react";
import { ShareIcon, CheckIcon } from "@/components/icons";

export function ShareButton() {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access can be unavailable or denied; fail silently.
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      aria-label="Copy link to this post"
      className="ml-auto inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      {copied ? (
        <>
          <CheckIcon className="size-4" />
          Copied
        </>
      ) : (
        <>
          <ShareIcon className="size-4" />
          Share
        </>
      )}
    </button>
  );
}
