import type { Site } from "@/types/site";

// Canonical host: shauryacodes.me 308-redirects here, so every URL we emit
// (metadataBase, sitemap, robots, feed) should point at this host directly
// rather than through the redirect.
export const SITE_URL = "https://www.shauryacodes.me";
// One stable identifier for "Shaurya Jha" across every JSON-LD block, so
// search engines tie the homepage Person and each post's author together.
export const PERSON_ID = `${SITE_URL}/#person`;
export const SITE_DESCRIPTION = "Software engineer. Building products, not just projects.";

export const site: Site = {
  name: "Shaurya Jha",
  role: "Engineer · Founder",
  credibility:
    "Building multilingual voice AI for hiring at Dhwani. Previously at Ownpath, Solarpunk, and Brixline.",
  email: "shauryajha35@gmail.com",
  calHref: "https://cal.com/shaurya35/30min",
};
