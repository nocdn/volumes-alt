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
    const reqUrl = new URL(request.url);
    const debugFromQuery = reqUrl.searchParams.get("debug") === "true";
    const body = await request.json();
    const url: unknown = body?.url;
    const tagsInput: unknown = body?.tags;
    const debugFromBody =
      typeof body?.debug === "boolean"
        ? body.debug
        : typeof body?.debug === "string"
          ? body.debug.toLowerCase() === "true"
          : false;
    const debug = debugFromQuery || debugFromBody;

    if (typeof url !== "string" || !url.trim()) {
      return new Response("Invalid url", { status: 400 });
    }

    const tags: string[] = Array.isArray(tagsInput)
      ? tagsInput
          .map((t) => (typeof t === "string" ? t.trim().toLowerCase() : ""))
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

    const payload = {
      url: normalizedUrl,
      title,
      tags,
      favicon,
    };

    console.log("[api/bookmarks] incoming body:", body);
    console.log("[api/bookmarks] normalizedUrl:", normalizedUrl);
    console.log("[api/bookmarks] tags:", tags);
    console.log("[api/bookmarks] metadata:", metadata);
    console.log("[api/bookmarks] fallbackFavicon:", fallbackFavicon);
    console.log("[api/bookmarks] final payload:", payload);

    if (debug) {
      return new Response(
        JSON.stringify({ debug: true, payload, message: "Not persisted" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const newId = await convex.mutation(api.bookmarks.createBookmark, payload);

    return new Response(JSON.stringify({ id: newId }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Failed to create bookmark via API", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
