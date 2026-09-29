// Logos for the experience section's "Technologies & Tools" row. Each key has
// a matching /public/tech/<key>.svg (from devicon, MIT). `invertInDark` marks
// the near-black logos that would vanish on the dark theme's surface.
export const tech = {
  nextjs: { label: "Next.js", invertInDark: true },
  react: { label: "React" },
  typescript: { label: "TypeScript" },
  javascript: { label: "JavaScript" },
  tailwindcss: { label: "Tailwind CSS" },
  nodejs: { label: "Node.js" },
  express: { label: "Express.js", invertInDark: true },
  python: { label: "Python" },
  fastapi: { label: "FastAPI" },
  rust: { label: "Rust", invertInDark: true },
  go: { label: "Go" },
  postgresql: { label: "PostgreSQL" },
  mongodb: { label: "MongoDB" },
  redis: { label: "Redis" },
  docker: { label: "Docker" },
  aws: { label: "AWS" },
  vercel: { label: "Vercel", invertInDark: true },
  firebase: { label: "Firebase" },
  prisma: { label: "Prisma", invertInDark: true },
  figma: { label: "Figma" },
  git: { label: "Git" },
  github: { label: "GitHub", invertInDark: true },
  electron: { label: "Electron" },
  sonarqube: { label: "SonarQube" },
} satisfies Record<string, { label: string; invertInDark?: boolean }>;

export type TechKey = keyof typeof tech;
