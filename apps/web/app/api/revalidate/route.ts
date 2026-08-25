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

  revalidatePath("/writing");
  revalidatePath("/writing/[slug]", "page");
  revalidatePath("/");

  // revalidatePath only marks the cache stale — the actual re-render happens
  // on the next request to that path. Warm it here, inside this handler, so
  // the page is already fresh by the time this responds instead of waiting
  // on whichever visitor happens to hit it next.
  const origin = request.nextUrl.origin;
  await Promise.allSettled([
    fetch(`${origin}/writing`, { cache: "no-store" }),
    fetch(`${origin}/`, { cache: "no-store" }),
  ]);

  return NextResponse.json({ revalidated: true }, { status: 200 });
}
