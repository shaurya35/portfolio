import type { MetadataRoute } from "next";
import { getPosts } from "@/lib/api";

const SITE_URL = "https://shauryacodes.me";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const routes: MetadataRoute.Sitemap = ["", "/projects", "/writing"].map(
    (route) => ({
      url: `${SITE_URL}${route}`,
    }),
  );
  // Keep the sitemap useful during a transient API outage. The three core
  // routes do not depend on the Rust service, while post URLs can be picked
  // up again as soon as the next sitemap request succeeds.
  let posts;
  try {
    posts = await getPosts();
  } catch {
    return routes;
  }

  return [
    ...routes,
    ...posts
      .filter((post) => post.source === "native")
      .map((post) => ({
        url: `${SITE_URL}/writing/${post.slug}`,
        lastModified: post.updatedAt ?? post.date,
      })),
  ];
}
