"use client";

import { createContext, useCallback, useContext, useRef } from "react";

type UnsavedChangesContextValue = {
  setDirty: (dirty: boolean) => void;
  /** Returns true if it's safe to navigate away right now — either nothing
   * is dirty, or the user confirmed they want to discard changes. */
  confirmNavigation: () => boolean;
};

const UnsavedChangesContext = createContext<UnsavedChangesContextValue | null>(null);

const CONFIRM_MESSAGE = "You have unsaved changes. Leave without saving?";

/**
 * One interception point for "is it safe to leave the current post form"
 * instead of teaching every nav target (the top nav's links, the logout
 * button) about `PostForm` directly. `PostForm` registers its own dirty
 * state here as the user types; `Nav` reads it back from the single click
 * handler that wraps its admin links. Mounted in the root layout (not
 * scoped to `/admin`) because `Nav` renders on every page and needs the
 * hook to always be available.
 */
export function UnsavedChangesProvider({ children }: { children: React.ReactNode }) {
  const dirtyRef = useRef(false);

  const setDirty = useCallback((dirty: boolean) => {
    dirtyRef.current = dirty;
  }, []);

  const confirmNavigation = useCallback(() => {
    if (!dirtyRef.current) return true;
    return window.confirm(CONFIRM_MESSAGE);
  }, []);

  return (
    <UnsavedChangesContext.Provider value={{ setDirty, confirmNavigation }}>
      {children}
    </UnsavedChangesContext.Provider>
  );
}

export function useUnsavedChanges(): UnsavedChangesContextValue {
  const context = useContext(UnsavedChangesContext);
  if (!context) {
    throw new Error("useUnsavedChanges must be used within an UnsavedChangesProvider");
  }
  return context;
}
