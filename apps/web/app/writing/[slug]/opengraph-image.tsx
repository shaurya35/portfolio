import { ImageResponse } from "next/og";
import { notFound } from "next/navigation";
import { getNativePost, getPosts } from "@/lib/api";

export const alt = "Writing by Shaurya Jha";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// The page's generateStaticParams doesn't cover this file — an image route is
// a Route Handler of its own, and without its own list every request for a
// post's card (each share, each crawler) re-rendered the PNG in a function.
export async function generateStaticParams() {
  const posts = await getPosts();
  return posts
    .filter((post) => post.source === "native")
    .map((post) => ({ slug: post.slug }));
}

export default async function OpenGraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getNativePost(slug);

  if (!post) {
    notFound();
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          backgroundColor: "#100f0f",
          color: "#fafafa",
        }}
      >
        <div style={{ display: "flex", fontSize: 30, color: "#60a5fa" }}>
          shauryacodes.me / writing
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 30, color: "#a1a1a1" }}>
            {post.category}
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 24,
              maxWidth: "1020px",
              fontSize: 64,
              fontWeight: 700,
              lineHeight: 1.1,
              letterSpacing: "-0.04em",
            }}
          >
            {post.title}
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 26, color: "#a1a1a1" }}>
          Shaurya Jha · Engineer · Founder
        </div>
      </div>
    ),
    { ...size },
  );
}
