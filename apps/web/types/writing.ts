export type WritingSource = "x" | "medium";

export type Writing = {
  slug: string;
  title: string;
  description: string;
  date: string;
  category: string;
  source: WritingSource;
  href: string;
};
