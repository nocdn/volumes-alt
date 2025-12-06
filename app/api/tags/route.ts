import { NextResponse } from "next/server";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";

// Revalidate this route every 3 days (in seconds)
export const revalidate = 259200;

// Make this a static route with ISR (so Next can cache the response)
export const dynamic = "force-static";

export async function GET() {
  try {
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

    return NextResponse.json(tags);
  } catch (error) {
    console.error("Failed to fetch tags via API", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function POST() {
  return new NextResponse("Method Not Allowed", { status: 405 });
}
