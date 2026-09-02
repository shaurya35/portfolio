"use client";

import { useEffect, useRef } from "react";

const STORAGE_KEY = "theme";

type ThemePref = "light" | "dark" | "system";

const NEXT: Record<ThemePref, ThemePref> = {
  system: "light",
  light: "dark",
  dark: "system",
};

const LABEL: Record<ThemePref, string> = {
  system: "Use system theme",
  light: "Use light theme",
  dark: "Use dark theme",
};

function resolve(pref: ThemePref): "light" | "dark" {
  if (pref === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return pref;
}

function apply(pref: ThemePref) {
  const root = document.documentElement;
  root.setAttribute("data-theme-pref", pref);
  root.setAttribute("data-theme", resolve(pref));
}

/**
 * Cycles system -> light -> dark -> system. `data-theme` (light/dark) is what
 * every color token in globals.css keys off; `data-theme-pref` (the three
 * states above) is what this component's own icon visibility keys off, so
 * the right icon shows with no client-side render pass or hydration flash —
 * same trick the two-state version used, just with a third icon.
 */
export function ThemeToggle() {
  // Label/title are kept in sync via direct DOM writes rather than React
  // state — same reasoning as apply() below: reading the real client-side
  // preference during render would mismatch the "system" default the server
  // rendered, and setState in an effect just to reflect it back is a
  // pointless extra render for two text attributes nothing else depends on.
  const buttonRef = useRef<HTMLButtonElement>(null);

  const syncLabel = (pref: ThemePref) => {
    const button = buttonRef.current;
    if (!button) return;
    button.setAttribute("aria-label", `Theme: ${pref}. Click to switch to ${NEXT[pref]}.`);
    button.title = LABEL[pref];
  };

  useEffect(() => {
    const current =
      (document.documentElement.getAttribute("data-theme-pref") as ThemePref | null) ??
      "system";
    syncLabel(current);
  }, []);

  // While the preference is "system", follow the OS live instead of only
  // resolving it once at toggle-click or page-load time.
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (document.documentElement.getAttribute("data-theme-pref") === "system") {
        document.documentElement.setAttribute("data-theme", resolve("system"));
      }
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const cycle = () => {
    const current =
      (document.documentElement.getAttribute("data-theme-pref") as ThemePref | null) ??
      "system";
    const next = NEXT[current];
    apply(next);
    window.localStorage.setItem(STORAGE_KEY, next);
    syncLabel(next);
  };

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={cycle}
      aria-label="Theme: system. Click to switch to light."
      title={LABEL.system}
      className="flex size-7 cursor-pointer items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:text-foreground"
    >
      {/* Sun: shown when data-theme-pref="light" */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        className="hidden size-4 theme-light:block"
      >
        <circle cx="12" cy="12" r="4" />
        <path
          strokeLinecap="round"
          d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
        />
      </svg>
      {/* Moon: shown when data-theme-pref="dark" */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        className="hidden size-4 theme-dark:block"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"
        />
      </svg>
      {/* Monitor: shown when data-theme-pref="system" (also the default before hydration) */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        className="size-4 theme-light:hidden theme-dark:hidden"
      >
        <rect x="3" y="4" width="18" height="13" rx="1.5" />
        <path strokeLinecap="round" d="M8 20h8M12 17v3" />
      </svg>
    </button>
  );
}
