"use client";

import { memo, useCallback, useMemo, useRef, useState, useEffect } from "react";
import { motion } from "motion/react";
import { useMutation } from "convex/react";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import { api } from "../../convex/_generated/api";

// Type for bookmark from Convex
type Bookmark = Doc<"bookmarks"> & { _creationTime: number };

interface BookmarkListProps {
  bookmarks: Bookmark[];
  onEdit?: (bookmark: Bookmark) => void;
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
  onDelete,
  onEdit,
}: {
  bookmark: Bookmark;
  formattedDate: string;
  onDelete: (id: Id<"bookmarks">) => void;
  onEdit?: (bookmark: Bookmark) => void;
}) {
  const isFetchingPlaceholder = bookmark.title === "Fetching title";

  const handleFaviconClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onEdit?.(bookmark);
    },
    [bookmark, onEdit]
  );

  const handleTitleClick = useCallback(() => {
    window.open(bookmark.url, "_blank", "noopener,noreferrer");
  }, [bookmark.url]);

  const handleDeleteClick = useCallback(() => {
    onDelete(bookmark._id);
  }, [bookmark._id, onDelete]);

  return (
    <div className="flex items-center gap-3 group">
      {/* Favicon */}
      {isFetchingPlaceholder ? (
        <div
          className="shrink-0 w-4 h-4 rounded-md bg-[#E0E8FF] animate-spin"
          onClick={handleFaviconClick}
        />
      ) : (
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
      )}

      {/* Title */}
      <span
        onClick={handleTitleClick}
        className={`font-inter text-base cursor-pointer truncate flex-1 ${
          bookmark.title === "Fetching title" ? "text-gray-400" : ""
        }`}
        style={{ fontWeight: 400 }}
      >
        {bookmark.title}
      </span>

      {/* Delete Button */}
      <span
        className="text-sm text-[#FD2B38] cursor-pointer transition-all font-medium duration-100 font-rounded opacity-0 group-hover:opacity-100"
        onClick={handleDeleteClick}
      >
        Delete
      </span>

      {/* Date */}
      <span className="ml-auto text-sm tabular-nums font-rounded text-gray-400 shrink-0">
        {formattedDate}
      </span>
    </div>
  );
});

export const BookmarkList = memo(function BookmarkList({
  bookmarks,
  onEdit,
}: BookmarkListProps) {
  const deleteBookmark = useMutation(api.bookmarks.deleteBookmark);
  const [pendingDeletions, setPendingDeletions] = useState<
    Set<Id<"bookmarks">>
  >(() => new Set());

  const handleDelete = useCallback(
    (id: Id<"bookmarks">) => {
      setPendingDeletions((prev) => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });

      deleteBookmark({ id }).catch((error) => {
        console.error("Failed to delete bookmark", error);
        setPendingDeletions((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      });
    },
    [deleteBookmark]
  );

  const visibleBookmarks = useMemo(
    () => bookmarks.filter((bookmark) => !pendingDeletions.has(bookmark._id)),
    [bookmarks, pendingDeletions]
  );

  // Memoize formatted dates to avoid recalculation on each render
  const bookmarksWithDates = useMemo(() => {
    return visibleBookmarks.map((bookmark) => ({
      bookmark,
      formattedDate: formatDate(bookmark._creationTime),
    }));
  }, [visibleBookmarks]);

  // Only animate on first load; subsequent renders are instant.
  const hasAnimatedRef = useRef(false);
  const shouldAnimate = !hasAnimatedRef.current;

  useEffect(() => {
    if (shouldAnimate && bookmarksWithDates.length > 0) {
      hasAnimatedRef.current = true;
    }
  }, [bookmarksWithDates.length, shouldAnimate]);

  // if (visibleBookmarks.length === 0) {
  //   return (
  //     <div className="flex flex-col gap-4 w-[50%] px-1">
  //       <p className="text-gray-400 text-sm text-center py-8">
  //         No bookmarks found
  //       </p>
  //     </div>
  //   );
  // }

  return (
    <div className="flex flex-col gap-4 w-[50%] px-1">
      {bookmarksWithDates.map(({ bookmark, formattedDate }, index) => (
        <motion.div
          key={bookmark._id}
          initial={shouldAnimate ? { opacity: 0, filter: "blur(1px)" } : false}
          animate={
            shouldAnimate ? { opacity: 1, filter: "blur(0px)" } : undefined
          }
          transition={
            shouldAnimate
              ? {
                  duration: 0.15,
                  delay: index < 20 ? index * 0.02 : 0,
                }
              : undefined
          }
        >
          <BookmarkItem
            bookmark={bookmark}
            formattedDate={formattedDate}
            onDelete={handleDelete}
            onEdit={onEdit}
          />
        </motion.div>
      ))}
    </div>
  );
});
