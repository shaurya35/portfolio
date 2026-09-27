import type { Metadata } from "next";
import { site } from "@/content/site";

// Next.js replaces openGraph/twitter/alternates wholesale per segment — it
// does not deep-merge them with the parent layout's. A page that sets only
// `title`/`description` silently inherits the *entire* layout openGraph
// block, including its og:url, which is how a shared /writing link used to
// render a homepage card. Every public page must build a complete object,
// so this helper is the one place that does it.
// Article-only extras layered onto the base "website" openGraph object.
// Kept separate (and cast at the boundary below) rather than typed against
// next's OpenGraph union, since that union is discriminated on `type` and
// isn't exported for a clean Partial<> override.
type ArticleExtras = {
  type: "article";
  publishedTime: string;
  modifiedTime: string;
  authors: string[];
};

export function pageMetadata({
  title,
  description,
  path,
  image = "/opengraph-image",
  imageAlt,
  article,
}: {
  title?: string;
  description: string;
  path: string;
  image?: string;
  imageAlt?: string;
  article?: ArticleExtras;
}): Metadata {
  const resolvedTitle = title ?? site.name;
  const images = [
    {
      url: image,
      width: 1200,
      height: 630,
      alt: imageAlt ?? resolvedTitle,
    },
  ];

  return {
    ...(title ? { title } : {}),
    description,
    alternates: {
      canonical: path,
      types: {
        "application/rss+xml": [
          {
            url: "/writing/feed.xml",
            title: "Shaurya Jha Writing",
          },
        ],
      },
    },
    openGraph: {
      type: "website",
      url: path,
      siteName: site.name,
      title: resolvedTitle,
      description,
      images,
      ...article,
    } as Metadata["openGraph"],
    twitter: {
      card: "summary_large_image",
      creator: "@_shaurya35",
      title: resolvedTitle,
      description,
      images: [image],
    },
  };
}
