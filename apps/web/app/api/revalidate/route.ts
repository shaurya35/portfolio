import { timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";
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

  // getPosts/getPost fetch with cache: "no-store" (apps/web/lib/api.ts), so
  // /writing, /writing/[slug], and / are fully dynamic — nothing to
  // invalidate here. These calls are harmless no-ops kept in case any part
  // of the route tree reintroduces cached data later.
  revalidatePath("/writing");
  revalidatePath("/writing/[slug]", "page");
  revalidatePath("/");

  return NextResponse.json({ revalidated: true }, { status: 200 });
}
