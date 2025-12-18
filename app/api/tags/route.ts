import { NextResponse } from "next/server";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { cacheLife, cacheTag } from "next/cache";

async function getTags() {
  "use cache";
  cacheTag("bookmarks-tags");
  cacheLife("days"); // 1 day client, 1 week server

  const bookmarks = await fetchQuery(api.bookmarks.list, {});

  const tagSet = new Set<string>();

  for (const bookmark of bookmarks) {
    const tags = bookmark.tags ?? [];

    for (const rawTag of tags) {
      if (typeof rawTag !== "string") continue;

      const tag = rawTag.trim();
      if (tag.length === 0) continue;

      tagSet.add(tag);
    }
  }

  const tags = Array.from(tagSet).sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: "base" })
  );

  return {
    structured: tags,
    list: tags.join(", "),
  };
}

export async function GET() {
  try {
    const data = await getTags();

    return NextResponse.json(data, {
      headers: {
        // CDN + browser caching: 1 day
        // stale-while-revalidate: serve stale for 7 days while revalidating
        "Cache-Control":
          "public, s-maxage=86400, max-age=86400, stale-while-revalidate=604800",
        // Vercel-specific CDN cache (takes precedence on Vercel Edge)
        "CDN-Cache-Control": "max-age=86400",
      },
    });
  } catch (error) {
    console.error("Failed to fetch tags via API", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function POST() {
  return new NextResponse("Method Not Allowed", { status: 405 });
}
