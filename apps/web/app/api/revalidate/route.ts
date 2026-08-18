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
  revalidatePath("/");

  return NextResponse.json({ revalidated: true }, { status: 200 });
}
