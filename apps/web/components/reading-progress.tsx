"use client";

import { useEffect, useRef, useState } from "react";

export function ReadingProgress() {
  const [progress, setProgress] = useState(0);
  const ticking = useRef(false);

  useEffect(() => {
    const measure = () => {
      const scrollable =
        document.documentElement.scrollHeight - window.innerHeight;
      const ratio = scrollable > 0 ? window.scrollY / scrollable : 0;
      setProgress(Math.min(1, Math.max(0, ratio)));
      ticking.current = false;
    };

    const onScrollOrResize = () => {
      if (ticking.current) return;
      ticking.current = true;
      requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, []);

  return (
    // Purely decorative: the scroll position is already conveyed by the
    // scrollbar, so this is hidden from assistive tech rather than announced
    // as a second, redundant progress source.
    <div
      aria-hidden="true"
      className="fixed top-0 left-0 z-50 h-[3px] w-full bg-transparent"
    >
      {/* Ink, not `accent`. `--accent` is reserved for interactive affordances
          (links, focus rings); a passive reading indicator borrowing it reads
          as clickable and fights the site's neutral palette. `--foreground`
          inverts with the theme toggle for free. */}
      <div
        className="h-full bg-foreground motion-safe:transition-[width] motion-safe:duration-150 motion-safe:ease-out"
        style={{ width: `${progress * 100}%` }}
      />
    </div>
  );
}
