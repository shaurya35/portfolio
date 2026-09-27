"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

type ToastVariant = "success" | "error";

type Toast = {
  id: number;
  message: string;
  variant: ToastVariant;
};

type ToastContextValue = {
  show: (message: string, variant?: ToastVariant) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

// Errors stay up longer: a success toast only confirms what the user just
// did, but an error ("the public site didn't refresh") is news they need to
// act on, and at 3.5s it was easy to miss while the page navigated away.
// There's a dismiss button for either.
const AUTO_DISMISS_MS: Record<ToastVariant, number> = {
  success: 3500,
  error: 10000,
};

/**
 * A minimal toast stack — no library. Two variants, auto-dismiss, no
 * promise-chaining or rich content. Mounted once in the root layout so it's
 * available everywhere, though in practice only the admin pages use it.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback(
    (message: string, variant: ToastVariant = "success") => {
      const id = nextId.current++;
      setToasts((current) => [...current, { id, message, variant }]);
      window.setTimeout(() => dismiss(id), AUTO_DISMISS_MS[variant]);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4 sm:items-end sm:px-6"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex max-w-sm items-center gap-3 rounded-md border px-3 py-2 text-sm shadow-sm ${
              toast.variant === "error"
                ? "border-destructive/30 bg-background text-destructive"
                : "border-border bg-background text-foreground"
            }`}
          >
            <span className="min-w-0 flex-1">{toast.message}</span>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              aria-label="Dismiss"
              className="cursor-pointer text-muted-foreground transition-colors hover:text-foreground"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
