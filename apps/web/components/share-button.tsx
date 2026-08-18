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
      className="ml-auto inline-flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
    >
      {copied ? (
        <>
          <CheckIcon className="size-3.5" />
          Copied
        </>
      ) : (
        <>
          <ShareIcon className="size-3.5" />
          Share
        </>
      )}
    </button>
  );
}
