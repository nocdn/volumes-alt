"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useMemo, useCallback, useState, useTransition } from "react";
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
  const [isPending, startTransition] = useTransition();

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

  // Filter bookmarks based on search query (title, url, tags)
  const filteredBookmarks = useMemo(() => {
    if (!bookmarks) return [];
    if (!searchQuery.trim()) return bookmarks;

    const query = searchQuery.toLowerCase().trim();
    return bookmarks.filter((bookmark) => {
      const titleMatch = bookmark.title.toLowerCase().includes(query);
      const urlMatch = bookmark.url.toLowerCase().includes(query);
      const tagMatch = bookmark.tags.some((tag) =>
        tag.toLowerCase().includes(query)
      );
      return titleMatch || urlMatch || tagMatch;
    });
  }, [bookmarks, searchQuery]);

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
          console.log("Adding bookmark with favicon:", favicon);

          await createBookmark({
            url: normalizedUrl,
            title,
            tags,
          });
        }
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
        setEditingBookmark(null);
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
      />
      <div className="h-8" /> {/* gap-8 equivalent */}
      <BookmarkList bookmarks={filteredBookmarks} onEdit={handleEditBookmark} />
    </div>
  );
}
