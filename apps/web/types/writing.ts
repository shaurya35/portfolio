export type WritingSource = "x" | "medium" | "native";

export type WritingStatus = "draft" | "published";

export type Writing = {
  slug: string;
  title: string;
  description: string;
  date: string;
  category: string;
  source: WritingSource;
  href?: string;
  html?: string;
  status?: WritingStatus;
  updatedAt?: string;
};
