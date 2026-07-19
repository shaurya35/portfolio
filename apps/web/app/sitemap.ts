import type { MetadataRoute } from "next";

const SITE_URL = "https://shauryacodes.me";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ["", "/projects", "/blog"];

  return routes.map((route) => ({
    url: `${SITE_URL}${route}`,
    lastModified: new Date(),
  }));
}
