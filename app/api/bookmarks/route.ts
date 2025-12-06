import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";
import { getPageMetadata } from "../../actions";

const convexUrl =
  process.env.NEXT_PUBLIC_CONVEX_URL || process.env.CONVEX_URL || "";
const convex = convexUrl ? new ConvexHttpClient(convexUrl) : null;

function getHostname(input: string): string | null {
  try {
    const parsed = new URL(input.includes("://") ? input : `https://${input}`);
    return parsed.hostname;
  } catch {
    return null;
  }
}

function buildFaviconUrl(domain: string | null): string {
  if (!domain) {
    return "https://www.google.com/s2/favicons?domain=example.com&sz=128";
  }
  return `https://icons.duckduckgo.com/ip3/${encodeURIComponent(domain)}.ico`;
}

export async function GET() {
  return new Response("Method Not Allowed", { status: 405 });
}

export async function POST(request: Request) {
  if (!convex) {
    return new Response("Convex URL not configured", { status: 500 });
  }

  try {
    const body = await request.json();
    const url: unknown = body?.url;
    const tagsInput: unknown = body?.tags;

    if (typeof url !== "string" || !url.trim()) {
      return new Response("Invalid url", { status: 400 });
    }

    const tags: string[] = Array.isArray(tagsInput)
      ? tagsInput
          .map((t) => (typeof t === "string" ? t.trim() : ""))
          .filter((t) => t.length > 0)
      : [];

    const normalizedUrl = url.includes("://") ? url : `https://${url}`;

    let metadata: { title?: string; logo?: string } = {};
    try {
      metadata = await getPageMetadata(normalizedUrl);
    } catch (error) {
      console.error("Failed to fetch metadata", error);
    }

    const hostname = getHostname(normalizedUrl);
    const fallbackFavicon = buildFaviconUrl(hostname);
    const title = metadata.title?.trim() || normalizedUrl;
    const favicon = metadata.logo?.trim() || fallbackFavicon;

    const newId = await convex.mutation(api.bookmarks.createBookmark, {
      url: normalizedUrl,
      title,
      tags,
      favicon,
    });

    return new Response(JSON.stringify({ id: newId }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Failed to create bookmark via API", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
