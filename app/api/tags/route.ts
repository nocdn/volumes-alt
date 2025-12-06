import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";

const convexUrl =
  process.env.NEXT_PUBLIC_CONVEX_URL || process.env.CONVEX_URL || "";
const convex = convexUrl ? new ConvexHttpClient(convexUrl) : null;

const CACHE_TTL_MS = 30_000;
const CDN_S_MAXAGE = 30;
const CDN_STALE_WHILE_REVALIDATE = 60 * 60 * 24 * 3;
let cachedTags: string[] | null = null;
let cachedAt = 0;

export async function GET() {
  if (!convex) {
    return new Response("Convex URL not configured", { status: 500 });
  }

  const now = Date.now();
  if (cachedTags && now - cachedAt < CACHE_TTL_MS) {
    return new Response(JSON.stringify(cachedTags), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": `s-maxage=${CDN_S_MAXAGE}, stale-while-revalidate=${CDN_STALE_WHILE_REVALIDATE}`,
      },
    });
  }

  try {
    const bookmarks = await convex.query(api.bookmarks.list, {});
    const tagSet = new Set<string>();
    for (const bookmark of bookmarks) {
      for (const tag of bookmark.tags) {
        if (tag) tagSet.add(tag);
      }
    }
    const tags = Array.from(tagSet);
    cachedTags = tags;
    cachedAt = now;
    return new Response(JSON.stringify(tags), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": `s-maxage=${CDN_S_MAXAGE}, stale-while-revalidate=${CDN_STALE_WHILE_REVALIDATE}`,
      },
    });
  } catch (error) {
    console.error("Failed to fetch tags via API", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

export async function POST() {
  return new Response("Method Not Allowed", { status: 405 });
}
