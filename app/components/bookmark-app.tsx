"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useMemo, useCallback, useState, useEffect } from "react";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import { SearchInput } from "./search-input";
import { BookmarkList } from "./bookmark-list";
import { getPageMetadata } from "../actions";
import { ConvexClientProvider } from "../ConvexClientProvider";

type Bookmark = Doc<"bookmarks">;

type EditingBookmark = {
  id: Id<"bookmarks">;
  url: string;
  title?: string | null;
  tags: string[];
  favicon?: string;
};

function BookmarkAppContent() {
  const bookmarks = useQuery(api.bookmarks.list);
  const createBookmark = useMutation(api.bookmarks.createBookmark);
  const updateBookmark = useMutation(api.bookmarks.updateBookmark);
  const deleteBookmark = useMutation(api.bookmarks.deleteBookmark);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingBookmark, setEditingBookmark] =
    useState<EditingBookmark | null>(null);
  const [isRefreshingFavicon, setIsRefreshingFavicon] = useState(false);
  const [pendingEdits, setPendingEdits] = useState<
    Map<Id<"bookmarks">, { url: string; title?: string | null; tags: string[] }>
  >(() => new Map());
  const [pendingDeletions, setPendingDeletions] = useState<
    Set<Id<"bookmarks">>
  >(() => new Set());
  const [pendingCreations, setPendingCreations] = useState<Bookmark[]>([]);
  const [localBookmarks, setLocalBookmarks] = useState<Bookmark[] | null>(null);
  const CACHE_KEY = "bookmark-cache-v1";

  // Extract all unique tags from bookmarks for mention suggestions
  const allTags = useMemo(() => {
    if (!bookmarks) return [];
    const tagSet = new Set<string>();
    for (const bookmark of bookmarks) {
      for (const tag of bookmark.tags) {
        tagSet.add(tag);
      }
    }
    return Array.from(tagSet).sort();
  }, [bookmarks]);

  const baseBookmarks = useMemo(() => {
    if (localBookmarks) return localBookmarks;
    if (bookmarks) return bookmarks;
    return [];
  }, [bookmarks, localBookmarks]);

  const bookmarksWithPendingCreates = useMemo(() => {
    return [...pendingCreations, ...baseBookmarks];
  }, [pendingCreations, baseBookmarks]);

  const bookmarksWithPending = useMemo(() => {
    if (!bookmarksWithPendingCreates) return [];
    return bookmarksWithPendingCreates
      .filter((bookmark) => !pendingDeletions.has(bookmark._id))
      .map((bookmark) => {
        const pending = pendingEdits.get(bookmark._id);
        if (!pending) return bookmark;
        return {
          ...bookmark,
          url: pending.url,
          title: pending.title ?? bookmark.title,
          tags: pending.tags,
        };
      });
  }, [bookmarksWithPendingCreates, pendingEdits, pendingDeletions]);

  // Filter bookmarks based on search query (title, url, tags)
  const filteredBookmarks = useMemo(() => {
    if (!bookmarksWithPending) return [];
    // When editing, show all bookmarks (no filtering)
    if (editingBookmark) return bookmarksWithPending;
    if (!searchQuery.trim()) return bookmarksWithPending;

    const query = searchQuery.toLowerCase().trim();
    return bookmarksWithPending.filter((bookmark) => {
      const titleMatch = bookmark.title.toLowerCase().includes(query);
      const urlMatch = bookmark.url.toLowerCase().includes(query);
      const tagMatch = bookmark.tags.some((tag) =>
        tag.toLowerCase().includes(query)
      );
      return titleMatch || urlMatch || tagMatch;
    });
  }, [bookmarksWithPending, searchQuery, editingBookmark]);

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchQuery("");
  }, []);

  const handleSubmit = useCallback(
    async (
      url: string,
      tags: string[],
      titleFromInput?: string,
      editingId?: Id<"bookmarks">
    ) => {
      if (!url.trim()) return;

      const normalizedUrl = url.includes("://") ? url : `https://${url}`;
      const optimisticTitle = titleFromInput?.trim() || normalizedUrl;
      const optimisticDisplayTitle = titleFromInput?.trim() || "Fetching title";
      const getHostname = (input: string): string | null => {
        try {
          const parsed = new URL(
            input.includes("://") ? input : `https://${input}`
          );
          return parsed.hostname;
        } catch {
          return null;
        }
      };
      const buildFaviconUrl = (domain: string | null): string => {
        if (!domain) {
          return "https://www.google.com/s2/favicons?domain=example.com&sz=128";
        }
        return `https://icons.duckduckgo.com/ip3/${encodeURIComponent(domain)}.ico`;
      };
      const fallbackFavicon = buildFaviconUrl(getHostname(normalizedUrl));

      let optimisticCreationId: Id<"bookmarks"> | null = null;

      if (editingId) {
        setPendingEdits((prev) => {
          const next = new Map(prev);
          next.set(editingId, {
            url: normalizedUrl,
            title: optimisticTitle,
            tags,
          });
          return next;
        });
      } else {
        const tempId = `temp-${Date.now()}` as Id<"bookmarks">;
        const optimisticBookmark: Bookmark = {
          _id: tempId,
          _creationTime: Date.now(),
          url: normalizedUrl,
          title: optimisticDisplayTitle,
          tags,
          favicon: fallbackFavicon,
        };
        optimisticCreationId = tempId;
        setPendingCreations((prev) => [optimisticBookmark, ...prev]);
      }

      let didSucceed = false;
      try {
        // Get the title and favicon from the server action
        const metadata = await getPageMetadata(normalizedUrl);
        const title = titleFromInput?.trim() || metadata.title || normalizedUrl;
        const favicon = metadata.logo || fallbackFavicon;

        if (editingId) {
          await updateBookmark({
            id: editingId,
            url: normalizedUrl,
            title,
            tags,
          });
        } else {
          await createBookmark({
            url: normalizedUrl,
            title,
            tags,
            favicon,
          });
        }
        didSucceed = true;
      } catch (error) {
        console.error("Failed to create bookmark:", error);
        // Fallback: create/update with URL as title if metadata fetch fails
        if (editingId) {
          await updateBookmark({
            id: editingId,
            url: normalizedUrl,
            title: titleFromInput?.trim() || normalizedUrl,
            tags,
          });
        } else {
          await createBookmark({
            url: normalizedUrl,
            title: titleFromInput?.trim() || normalizedUrl,
            tags,
            favicon: fallbackFavicon,
          });
        }
      }
      if (editingId) {
        setPendingEdits((prev) => {
          const next = new Map(prev);
          next.delete(editingId);
          return next;
        });
        if (didSucceed) {
          setEditingBookmark((current) =>
            current && current.id === editingId ? null : current
          );
        }
      } else {
        // Remove optimistic creation once server response is back (success or failure)
        if (optimisticCreationId) {
          setPendingCreations((prev) =>
            prev.filter((bookmark) => bookmark._id !== optimisticCreationId)
          );
        }
      }
    },
    [createBookmark, updateBookmark]
  );

  const handleEditBookmark = useCallback((bookmark: Bookmark) => {
    setEditingBookmark({
      id: bookmark._id,
      url: bookmark.url,
      title: bookmark.title,
      tags: bookmark.tags,
      favicon: bookmark.favicon,
    });
  }, []);

  const handleRefreshFavicon = useCallback(async () => {
    if (!editingBookmark || isRefreshingFavicon) return;
    setIsRefreshingFavicon(true);
    try {
      const metadata = await getPageMetadata(editingBookmark.url);
      const nextFavicon = metadata.logo?.trim();
      if (!nextFavicon) return;

      await updateBookmark({
        id: editingBookmark.id,
        favicon: nextFavicon,
      });
    } catch (error) {
      console.error("Failed to refresh favicon", error);
    } finally {
      setIsRefreshingFavicon(false);
    }
  }, [editingBookmark, isRefreshingFavicon, updateBookmark]);

  const handleDeleteEditing = useCallback(() => {
    setEditingBookmark((current) => {
      if (current) {
        // Optimistically remove the bookmark from local state
        setPendingDeletions((prev) => {
          const next = new Set(prev);
          next.add(current.id);
          return next;
        });

        // Trigger actual deletion
        deleteBookmark({ id: current.id }).catch((error) => {
          console.error("Failed to delete editing bookmark", error);
          setPendingDeletions((prev) => {
            const next = new Set(prev);
            next.delete(current.id);
            return next;
          });
        });
      }
      return null;
    });
  }, [deleteBookmark]);

  const handleCancelEditing = useCallback(() => {
    setEditingBookmark((current) => {
      if (current) {
        setPendingEdits((prev) => {
          const next = new Map(prev);
          next.delete(current.id);
          return next;
        });
      }
      return null;
    });
  }, []);

  // Load cached bookmarks on mount for instant display
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as Bookmark[];
        setLocalBookmarks(parsed);
      }
    } catch (error) {
      console.error("Failed to read cached bookmarks", error);
    }
  }, []);

  // When fresh data arrives from Convex, update cache and local state
  useEffect(() => {
    if (!bookmarks) return;
    console.log(`[Convex] Fetched ${bookmarks.length} bookmarks`);
    setLocalBookmarks(bookmarks);
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(bookmarks));
    } catch (error) {
      console.error("Failed to write cached bookmarks", error);
    }
  }, [bookmarks]);

  //   if (bookmarks === undefined) {
  //     return (
  //       <div className="flex flex-col items-center pt-20">
  //         <div className="w-[50%] h-28 bg-[#FEFFFF] border border-[#ECEDED] rounded-4xl animate-pulse" />
  //       </div>
  //     );
  //   }

  return (
    <div className="flex flex-col items-center">
      <SearchInput
        allTags={allTags}
        bookmarks={bookmarks}
        onSearchChange={handleSearchChange}
        onClearSearch={handleClearSearch}
        onSubmit={handleSubmit}
        editingBookmark={editingBookmark}
        onCancelEditing={handleCancelEditing}
        onDeleteEditing={handleDeleteEditing}
        onRefreshFavicon={handleRefreshFavicon}
        isRefreshingFavicon={isRefreshingFavicon}
        isRefreshing={bookmarks === undefined}
      />
      <div className="h-8" /> {/* gap-8 equivalent */}
      <BookmarkList
        bookmarks={filteredBookmarks}
        onEdit={handleEditBookmark}
        pendingDeletions={pendingDeletions}
      />
    </div>
  );
}

export function BookmarkApp() {
  return (
    <ConvexClientProvider>
      <BookmarkAppContent />
    </ConvexClientProvider>
  );
}
