"use client";

import { useEffect, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { CopyIcon, CheckIcon } from "@/components/icons";

function CopyButton({ getText }: { getText: () => string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(getText());
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
      aria-label="Copy code"
      className="flex size-7 cursor-pointer items-center justify-center rounded-md border border-current/20 bg-current/10 text-current transition-colors hover:bg-current/20"
    >
      {copied ? (
        <CheckIcon className="size-3.5" />
      ) : (
        <CopyIcon className="size-3.5" />
      )}
    </button>
  );
}

export function CodeBlockCopyButtons() {
  useEffect(() => {
    const blocks = Array.from(
      document.querySelectorAll<HTMLPreElement>(".post-content pre"),
    );
    const roots: Root[] = [];

    for (const pre of blocks) {
      const existing = pre.parentElement;
      if (existing?.hasAttribute("data-code-block-wrap")) continue;

      // The <pre> scrolls horizontally, and an absolutely positioned child of
      // a scroll container scrolls away with its content. Wrapping the block
      // in a non-scrolling relative parent keeps the copy button pinned to the
      // top-right corner no matter how far the code is scrolled.
      const wrap = document.createElement("div");
      wrap.setAttribute("data-code-block-wrap", "");
      wrap.className = "code-block-wrap";
      pre.parentNode?.insertBefore(wrap, pre);
      wrap.appendChild(pre);

      const container = document.createElement("div");
      container.setAttribute("data-code-copy-root", "");
      container.className = "code-copy-root";
      wrap.appendChild(container);

      const root = createRoot(container);
      // Read from the <pre>, not the wrapper, so the button's own markup can
      // never leak into the copied text.
      root.render(<CopyButton getText={() => pre.textContent ?? ""} />);
      roots.push(root);
    }

    return () => {
      for (const root of roots) {
        // Deferred: unmounting synchronously here can race with React's own
        // render pass for the surrounding tree (e.g. fast navigation away
        // from the page), producing "Attempted to synchronously unmount a
        // root while React was already rendering."
        queueMicrotask(() => root.unmount());
      }
    };
  }, []);

  return null;
}
