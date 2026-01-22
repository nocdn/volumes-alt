import type { Id } from "../../../convex/_generated/dataModel";

export interface SearchInputProps {
  allTags: string[];
  onSearchChange: (query: string) => void;
  onClearSearch?: () => void;
  onSubmit: (
    url: string,
    tags: string[],
    title?: string,
    editingId?: Id<"bookmarks">
  ) => Promise<void>;
  editingBookmark?: {
    id: Id<"bookmarks">;
    url: string;
    title?: string | null;
    tags: string[];
    favicon?: string;
  } | null;
  onCancelEditing?: () => void;
  onDeleteEditing?: () => void;
  onRefreshFavicon?: () => void;
  isRefreshingFavicon?: boolean;
  isRefreshing?: boolean;
}

export interface MentionListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

export interface MentionListProps {
  items: string[];
  command: (item: { id: string }) => void;
  query?: string;
}

export type ContentPart =
  | { type: "text"; value: string }
  | { type: "mention"; id: string };
