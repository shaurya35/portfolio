export type SocialIconName = "x" | "linkedin" | "github" | "medium" | "mail";

export type Social = {
  name: string;
  href: string;
  icon: SocialIconName;
};

export type Site = {
  name: string;
  role: string;
  credibility: string;
  email: string;
  calHref: string;
};
