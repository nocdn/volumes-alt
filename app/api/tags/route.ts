import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";

const convexUrl =
  process.env.NEXT_PUBLIC_CONVEX_URL || process.env.CONVEX_URL || "";
const convex = convexUrl ? new ConvexHttpClient(convexUrl) : null;

export async function GET() {
  if (!convex) {
    return new Response("Convex URL not configured", { status: 500 });
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
    return new Response(JSON.stringify(tags), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Failed to fetch tags via API", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

export async function POST() {
  return new Response("Method Not Allowed", { status: 405 });
}
