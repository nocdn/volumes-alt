import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  handler: async (ctx) => {
    const tasks = await ctx.db.query("bookmarks").order("desc").collect();
    return tasks;
  },
});

export const updateBookmark = mutation({
  args: {
    id: v.id("bookmarks"),
    title: v.optional(v.string()),
    url: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    favicon: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const existing = await ctx.db.get(id);
    if (!existing) {
      throw new Error("Bookmark not found");
    }
    // Filter out undefined values
    const filteredUpdates: {
      title?: string;
      url?: string;
      favicon?: string;
      tags?: string[];
    } = {};
    if (updates.title !== undefined) filteredUpdates.title = updates.title;
    if (updates.tags !== undefined) filteredUpdates.tags = updates.tags;
    if (updates.favicon !== undefined)
      filteredUpdates.favicon = updates.favicon;
    if (updates.url !== undefined) {
      // Only update favicon when the URL actually changes.
      if (updates.url !== existing.url) {
        filteredUpdates.url = updates.url;

        function getHostname(input: string): string | null {
          try {
            const url = new URL(
              input.includes("://") ? input : `https://${input}`
            );
            return url.hostname;
          } catch {
            return null;
          }
        }

        // If the caller didn't explicitly set a favicon, compute a sensible fallback.
        if (updates.favicon === undefined) {
          const hostname = getHostname(updates.url);
          filteredUpdates.favicon = hostname
            ? `https://icons.duckduckgo.com/ip3/${encodeURIComponent(hostname)}.ico`
            : "https://www.google.com/s2/favicons?domain=example.com&sz=128";
        }
      }
    }

    if (Object.keys(filteredUpdates).length === 0) return;

    await ctx.db.patch(id, filteredUpdates);
  },
});

export const deleteBookmark = mutation({
  args: {
    id: v.id("bookmarks"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// Bulk import from Supabase JSON export
export const importBookmarks = mutation({
  args: {
    bookmarks: v.array(
      v.object({
        title: v.string(),
        url: v.string(),
        tags: v.string(), // JSON string like "[\"tag1\",\"tag2\"]"
      })
    ),
  },
  handler: async (ctx, args) => {
    function getHostname(input: string): string | null {
      try {
        const url = new URL(input.includes("://") ? input : `https://${input}`);
        return url.hostname;
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

    let imported = 0;
    for (const bookmark of args.bookmarks) {
      const hostname = getHostname(bookmark.url);
      const faviconUrl = buildFaviconUrl(hostname);
      const tags = JSON.parse(bookmark.tags) as string[];

      await ctx.db.insert("bookmarks", {
        url: bookmark.url,
        title: bookmark.title,
        tags: tags,
        favicon: faviconUrl,
      });
      imported++;
    }

    return { imported };
  },
});

export const createBookmark = mutation({
  args: {
    url: v.string(),
    title: v.string(),
    comment: v.optional(v.string()),
    tags: v.array(v.string()),
    favicon: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    function getHostname(input: string): string | null {
      try {
        // Ensure there's a scheme so URL() can parse strings like "foo.com/path"
        const url = new URL(input.includes("://") ? input : `https://${input}`);
        // Use full hostname for better favicon accuracy (subdomains often have unique favicons)
        return url.hostname;
      } catch {
        return null;
      }
    }

    function buildFaviconUrl(domain: string | null): string {
      if (!domain) {
        // Fallback to a generic icon if domain extraction fails
        return "https://www.google.com/s2/favicons?domain=example.com&sz=128";
      }
      // Use DuckDuckGo's service as primary - more reliable and higher quality icons
      // Falls back gracefully to a default icon for unknown domains
      return `https://icons.duckduckgo.com/ip3/${encodeURIComponent(domain)}.ico`;
    }

    const hostname = getHostname(args.url);
    const faviconUrl = args.favicon ?? buildFaviconUrl(hostname);
    console.log("favicon url", faviconUrl, "for hostname", hostname);
    const newBookmarkId = await ctx.db.insert("bookmarks", {
      url: args.url,
      title: args.title,
      comment: args.comment,
      tags: args.tags,
      favicon: faviconUrl,
    });
    return newBookmarkId;
  },
});
