"use client";

import { useCallback } from "react";
import { useToast } from "@/components/toast";
import { syncPublicPages } from "@/app/admin/_lib/sync-public-pages";

/**
 * Returns a function to run after a save/delete has already succeeded. It
 * never throws — the write is done either way, and a thrown error here
 * would land in PostForm's "save failed" path — but a failed refresh gets
 * its own toast instead of disappearing into a server log, which is how the
 * old webhook-only path went unnoticed.
 */
export function useSyncPublicPages() {
  const { show } = useToast();

  return useCallback(async () => {
    try {
      await syncPublicPages();
    } catch {
      // "Any post": after a delete there's nothing left to re-save, and any
      // save re-runs the comparison that picks up the missing refresh.
      show("The public site didn't refresh. Save any post to retry.", "error");
    }
  }, [show]);
}
