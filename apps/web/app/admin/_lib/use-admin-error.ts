"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { ApiRequestError, isUnauthorized } from "@/app/admin/_lib/api";
import { useToast } from "@/app/admin/_components/toast";

/**
 * Single place every admin page routes a failed request through, instead of
 * each page hand-rolling its own `if (err.status === 401) router.replace(...)`
 * block. A 401 always means the session ended (expired, revoked, or never
 * existed) — toast it and bounce to login. Anything else gets the server's
 * own message when there is one, or a caller-supplied fallback.
 */
export function useAdminError() {
  const router = useRouter();
  const { show } = useToast();

  return useCallback(
    (err: unknown, fallback: string) => {
      if (isUnauthorized(err)) {
        show("Session expired — please sign in again.", "error");
        router.replace("/admin");
        return;
      }

      if (err instanceof ApiRequestError) {
        show(err.message, "error");
        return;
      }

      show(fallback, "error");
    },
    [router, show],
  );
}
