import { revalidateTag } from "next/cache";

/**
 * Called by the Laravel API after admin edits that change the storefront
 * (POST with header X-Revalidate-Secret). Expires the cached catalog so the
 * next visit renders fresh data.
 */
export async function POST(request: Request) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret || request.headers.get("x-revalidate-secret") !== secret) {
    return Response.json({ revalidated: false }, { status: 401 });
  }

  revalidateTag("catalog", { expire: 0 });
  return Response.json({ revalidated: true });
}
