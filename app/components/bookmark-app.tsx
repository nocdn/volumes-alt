"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
  useMemo,
  useCallback,
  useState,
  useTransition,
  useEffect,
} from "react";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import { SearchInput } from "./search-input";
import { BookmarkList } from "./bookmark-list";
import { getPageMetadata } from "../actions";

type Bookmark = Doc<"bookmarks">;

type EditingBookmark = {
  id: Id<"bookmarks">;
  url: string;
  title?: string | null;
  tags: string[];
};

export function BookmarkApp() {
  const bookmarks = useQuery(api.bookmarks.list);
  const createBookmark = useMutation(api.bookmarks.createBookmark);
  const updateBookmark = useMutation(api.bookmarks.updateBookmark);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingBookmark, setEditingBookmark] =
    useState<EditingBookmark | null>(null);
  const [pendingEdits, setPendingEdits] = useState<
    Map<Id<"bookmarks">, { url: string; title?: string | null; tags: string[] }>
  >(() => new Map());
  const [pendingCreations, setPendingCreations] = useState<Bookmark[]>([]);
  const [localBookmarks, setLocalBookmarks] = useState<Bookmark[] | null>(null);
  const [isPending, startTransition] = useTransition();
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
    return bookmarksWithPendingCreates.map((bookmark) => {
      const pending = pendingEdits.get(bookmark._id);
      if (!pending) return bookmark;
      return {
        ...bookmark,
        url: pending.url,
        title: pending.title ?? bookmark.title,
        tags: pending.tags,
      };
    });
  }, [bookmarksWithPendingCreates, pendingEdits]);

  // Filter bookmarks based on search query (title, url, tags)
  const filteredBookmarks = useMemo(() => {
    if (!bookmarksWithPending) return [];
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
  }, [bookmarksWithPending, searchQuery]);

  const handleSearchChange = useCallback((query: string) => {
    startTransition(() => {
      setSearchQuery(query);
    });
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
      const optimisticFavicon =
        "https://www.google.com/s2/favicons?domain=example.com&sz=128";

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
          title: "Fetching title",
          tags,
          favicon: optimisticFavicon,
        };
        optimisticCreationId = tempId;
        setPendingCreations((prev) => [optimisticBookmark, ...prev]);
      }

      let didSucceed = false;
      try {
        // Get the title and favicon from the server action
        const metadata = await getPageMetadata(normalizedUrl);
        const title = titleFromInput?.trim() || metadata.title || normalizedUrl;
        const favicon = metadata.logo;

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
    });
  }, []);

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
        onSearchChange={handleSearchChange}
        onSubmit={handleSubmit}
        editingBookmark={editingBookmark}
        onCancelEditing={handleCancelEditing}
        isRefreshing={bookmarks === undefined}
      />
      <div className="h-8" /> {/* gap-8 equivalent */}
      <BookmarkList bookmarks={filteredBookmarks} onEdit={handleEditBookmark} />
    </div>
  );
}
