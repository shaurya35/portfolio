import { getPosts } from "@/lib/api";

const SITE_URL = "https://shauryacodes.me";
const FEED_URL = `${SITE_URL}/writing/feed.xml`;

function escapeXml(value: string): string {
  return value.replace(/[<>&'\"]/g, (character) => {
    switch (character) {
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "&":
        return "&amp;";
      case "'":
        return "&apos;";
      case '"':
        return "&quot;";
      default:
        return character;
    }
  });
}

function toRfc822(date: string): string {
  return new Date(date).toUTCString();
}

export async function GET() {
  const posts = await getPosts();
  const latest = posts[0]?.updatedAt ?? posts[0]?.date ?? "1970-01-01T00:00:00.000Z";
  const items = posts
    .map((post) => {
      const url =
        post.source === "native"
          ? `${SITE_URL}/writing/${post.slug}`
          : post.href;

      if (!url) return null;

      return `
        <item>
          <title>${escapeXml(post.title)}</title>
          <link>${escapeXml(url)}</link>
          <guid isPermaLink="true">${escapeXml(url)}</guid>
          <description>${escapeXml(post.description)}</description>
          <category>${escapeXml(post.category)}</category>
          <pubDate>${toRfc822(post.date)}</pubDate>
        </item>`;
    })
    .filter((item): item is string => item !== null)
    .join("");

  const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Shaurya Jha Writing</title>
    <link>${SITE_URL}/writing</link>
    <description>Technical writing on what I&apos;ve actually shipped.</description>
    <language>en</language>
    <lastBuildDate>${toRfc822(latest)}</lastBuildDate>
    <atom:link href="${FEED_URL}" rel="self" type="application/rss+xml" />${items}
  </channel>
</rss>`;

  return new Response(feed, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
