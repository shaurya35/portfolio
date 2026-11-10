import type { Experience } from "@/types/experience";

export const experience: Experience[] = [
  {
    company: "Ownpath",
    companyHref: "https://ownpath.com",
    role: "Forward Deployed Engineer",
    start: "2025-12",
    end: "2026-06",
    location: "Bangalore, IN",
    mode: "Hybrid",
    tech: ["react", "typescript", "sonarqube"],
    highlights: [
      "Led Philips Greenheart, a preventive heart-health platform, from review and POC to production, working directly with the client on requirements and delivery.",
      "Set up CI/CD with SonarQube quality gates: 86% test coverage on Greenheart and 93% on Philips Population Insight, both under 3% duplication.",
      "Owned full release cycles that met Philips' internal security and health-tooling standards, and ran Agile for the team.",
      "Built Ownpath Labs' AI design agent, which turns outlines and chat into on-brand presentation decks, supports chat-based edits, and exports to PPTX or PDF.",
      "Built Marvin, a Discord bot that automates office attendance with scheduled RSVPs and a live headcount.",
    ],
  },
  {
    company: "Solarpunk",
    companyHref: "https://solarpunk.technology/",
    role: "Product Engineer",
    start: "2025-07",
    end: "2025-11",
    location: "Delaware, US",
    mode: "Remote",
    tech: ["electron", "python", "typescript"],
    highlights: [
      "Owned the Windows build of the Electron desktop app: fixed EXE issues and optimised the build pipeline.",
      "Added Microsoft account support with automated email analysis, processed in real time over pub/sub.",
      "Built a production ingestion pipeline for documents and images across multiple formats.",
      "Built a multi-agent system with Agno and reworked system prompts for deeper, more accurate file analysis.",
      "Shipped a full onboarding flow, an interactive dataframe viewer, and a UI refresh.",
    ],
  },
  {
    company: "Brixline",
    companyHref: "https://brixline.com",
    role: "Founding Engineer",
    start: "2025-02",
    end: "2025-05",
    location: "Bangalore, IN",
    mode: "Remote",
    tech: ["nextjs", "typescript", "tailwindcss", "figma"],
    highlights: [
      "Led development from zero as the company's first engineer.",
      "Set up the monorepo and turned every Figma design into production code.",
      "Built the build and deployment pipelines and shipped the company website.",
      "Worked with the other developers to shape and refine the product.",
    ],
  },
];
