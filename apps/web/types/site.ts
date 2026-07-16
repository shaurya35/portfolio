export type SocialIconName = "x" | "linkedin" | "github" | "mail";

export type Social = {
  name: string;
  href: string;
  icon: SocialIconName;
};

export type Site = {
  name: string;
  role: string;
  tagline: string;
  email: string;
};
