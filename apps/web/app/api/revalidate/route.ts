import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";

function isAuthorized(provided: string | null, expected: string | undefined): boolean {
  if (!provided || !expected) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-revalidate-secret");

  if (!isAuthorized(secret, process.env.REVALIDATE_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // getPosts/getPost both tag their fetch "posts" (apps/web/lib/api.ts), so
  // this one call invalidates /, /writing, and every /writing/[slug] that
  // depends on that data — no need to enumerate paths. { expire: 0 } is
  // Next 16's way of saying "fully invalidate now" (the pre-16 default);
  // omitting the profile only emits a stale-while-revalidate warning.
  revalidateTag("posts", { expire: 0 });

  return NextResponse.json({ revalidated: true }, { status: 200 });
}
