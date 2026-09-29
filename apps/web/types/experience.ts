import type { TechKey } from "@/content/tech";

export type ExperienceMode = "On-Site" | "Remote" | "Hybrid";

export type Experience = {
  company: string;
  companyHref: string;
  role: string;
  start: string;
  end: string | null;
  location: string;
  mode: ExperienceMode;
  /** Shown when the row is expanded. A role with neither gets no chevron. */
  tech?: TechKey[];
  highlights?: string[];
};
