import { getPosts } from "@/lib/api";
import { SITE_URL } from "@/content/site";

const FEED_URL = `${SITE_URL}/writing/feed.xml`;

// Feed readers decide "have I seen this item?" by <guid>, so a guid must never
// change once published. Native guids were built from the site URL back when
// it was https://shauryacodes.me; moving SITE_URL to www made every existing
// item look new to subscribers. The guid stays pinned to the original host
// (it still resolves, via the redirect) while <link> follows SITE_URL.
const GUID_BASE = "https://shauryacodes.me";

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
  // The newest change to any item, not the newest post's: posts are ordered
  // by publish date, so an edit to an older post left this unchanged.
  const latest = posts.reduce(
    (max, post) => {
      const changed = post.updatedAt ?? post.date;
      return Date.parse(changed) > Date.parse(max) ? changed : max;
    },
    "1970-01-01T00:00:00.000Z",
  );
  const items = posts
    .map((post) => {
      const url =
        post.source === "native"
          ? `${SITE_URL}/writing/${post.slug}`
          : post.href;

      if (!url) return null;

      const guid =
        post.source === "native" ? `${GUID_BASE}/writing/${post.slug}` : url;

      return `
        <item>
          <title>${escapeXml(post.title)}</title>
          <link>${escapeXml(url)}</link>
          <guid isPermaLink="true">${escapeXml(guid)}</guid>
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
