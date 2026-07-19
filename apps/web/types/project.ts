export type Project = {
  slug: string;
  title: string;
  description: string;
  tech: string[];
  liveHref: string | null;
  githubHref: string | null;
  image?: string;
};
