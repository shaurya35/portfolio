export type BlogSource = "x" | "medium";

export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  date: string;
  category: string;
  source: BlogSource;
  href: string;
};
