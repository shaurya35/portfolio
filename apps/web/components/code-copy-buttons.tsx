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
      {copied ? <CheckIcon className="size-3.5" /> : <CopyIcon className="size-3.5" />}
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
      if (pre.querySelector("[data-code-copy-root]")) continue;
      const container = document.createElement("div");
      container.setAttribute("data-code-copy-root", "");
      container.className = "code-copy-root";
      pre.appendChild(container);
      const root = createRoot(container);
      root.render(<CopyButton getText={() => pre.textContent ?? ""} />);
      roots.push(root);
    }

    return () => {
      for (const root of roots) {
        root.unmount();
      }
    };
  }, []);

  return null;
}
