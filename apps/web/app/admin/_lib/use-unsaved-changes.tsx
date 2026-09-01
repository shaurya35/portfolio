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
 * instead of rewriting every nav target (tab links, logout) to know about
 * PostForm directly. `PostForm` registers its own dirty state here as the
 * user types; `AdminLayout` reads it back from the single click handler that
 * wraps its whole nav row.
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
