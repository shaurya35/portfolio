"use client";

import { useLayoutEffect } from "react";

/**
 * Sets the tab title from the client, for the one page that can't through
 * metadata: a plain not-found.tsx can't export it (only the experimental
 * global-not-found can), and the layout's <title> streams in after
 * hydration, replacing anything set once. So it's re-applied whenever
 * <head> changes while this is mounted.
 *
 * A layout effect on purpose: its cleanup runs inside React's commit, so on
 * navigating away `active` is already false by the time the observer's
 * microtask sees the next page's title — it can't be overwritten back.
 */
export function DocumentTitle({ title }: { title: string }) {
  useLayoutEffect(() => {
    let active = true;
    const apply = () => {
      if (active && document.title !== title) document.title = title;
    };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(document.head, { subtree: true, childList: true, characterData: true });
    return () => {
      active = false;
      observer.disconnect();
    };
  }, [title]);

  return null;
}
