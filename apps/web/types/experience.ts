export type ExperienceMode = "On-Site" | "Remote" | "Hybrid";

export type Experience = {
  company: string;
  companyHref: string;
  role: string;
  start: string;
  end: string | null;
  location: string;
  mode: ExperienceMode;
};
