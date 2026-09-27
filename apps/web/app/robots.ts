import type { MetadataRoute } from "next";
import { SITE_URL } from "@/content/site";

export default function robots(): MetadataRoute.Robots {
  return {
    // No `disallow: "/admin"` on purpose: /admin is kept out of search by the
    // noindex in app/admin/layout.tsx, and a crawler blocked by robots.txt
    // never loads the page, so it would never see that noindex — and could
    // still index the bare URL if anything links to it.
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
