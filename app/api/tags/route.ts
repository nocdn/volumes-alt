import { NextResponse } from "next/server";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { cacheLife, cacheTag } from "next/cache";

async function getTags() {
  "use cache";
  cacheTag("bookmarks-tags");
  cacheLife("days");

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

// Route handler just calls the cached function
export async function GET() {
  try {
    const data = await getTags();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to fetch tags via API", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function POST() {
  return new NextResponse("Method Not Allowed", { status: 405 });
}
