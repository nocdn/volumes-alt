"use client";

import { memo, useCallback, useMemo } from "react";
import type { Doc, Id } from "../../convex/_generated/dataModel";

// Type for bookmark from Convex
type Bookmark = Doc<"bookmarks"> & { _creationTime: number };

interface BookmarkListProps {
  bookmarks: Bookmark[];
}

// Format date based on the rules:
// - Current year: "Dec 02" or "Jun 16"
// - Different year: "02.12.24"
function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const currentYear = new Date().getFullYear();
  const bookmarkYear = date.getFullYear();

  if (bookmarkYear === currentYear) {
    // Same year: "Dec 02"
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
    });
  } else {
    // Different year: "02.12.24"
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear().toString().slice(-2);
    return `${day}.${month}.${year}`;
  }
}

// Memoized individual bookmark item
const BookmarkItem = memo(function BookmarkItem({
  bookmark,
  formattedDate,
}: {
  bookmark: Bookmark;
  formattedDate: string;
}) {
  const handleFaviconClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      console.log(`editing ${bookmark._id}`, bookmark.tags);
    },
    [bookmark._id, bookmark.tags]
  );

  const handleTitleClick = useCallback(() => {
    window.open(bookmark.url, "_blank", "noopener,noreferrer");
  }, [bookmark.url]);

  return (
    <div className="flex items-center gap-3">
      {/* Favicon */}
      <img
        src={bookmark.favicon}
        alt=""
        width={16}
        height={16}
        className="shrink-0 cursor-pointer"
        onClick={handleFaviconClick}
        onError={(e) => {
          // Fallback to a default icon on error
          (e.target as HTMLImageElement).src =
            "https://www.google.com/s2/favicons?domain=example.com&sz=128";
        }}
      />

      {/* Title */}
      <span
        onClick={handleTitleClick}
        className="font-inter text-base cursor-pointer truncate flex-1"
        style={{ fontWeight: 400 }}
      >
        {bookmark.title}
      </span>

      {/* Date */}
      <span className="ml-auto text-sm tabular-nums text-gray-400 shrink-0">
        {formattedDate}
      </span>
    </div>
  );
});

export const BookmarkList = memo(function BookmarkList({
  bookmarks,
}: BookmarkListProps) {
  // Memoize formatted dates to avoid recalculation on each render
  const bookmarksWithDates = useMemo(() => {
    return bookmarks.map((bookmark) => ({
      bookmark,
      formattedDate: formatDate(bookmark._creationTime),
    }));
  }, [bookmarks]);

  if (bookmarks.length === 0) {
    return (
      <div className="flex flex-col gap-4 w-[50%] px-1">
        <p className="text-gray-400 text-sm text-center py-8">
          No bookmarks found
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 w-[50%] px-1">
      {bookmarksWithDates.map(({ bookmark, formattedDate }) => (
        <BookmarkItem
          key={bookmark._id}
          bookmark={bookmark}
          formattedDate={formattedDate}
        />
      ))}
    </div>
  );
});
