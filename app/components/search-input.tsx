"use client";

import {
  memo,
  useCallback,
  useRef,
  useEffect,
  useState,
  forwardRef,
  useImperativeHandle,
  useMemo,
} from "react";
import { Search, Plus, X, Loader } from "lucide-react";
import {
  useEditor,
  EditorContent,
  ReactRenderer,
  posToDOMRect,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Mention from "@tiptap/extension-mention";
import type { SuggestionProps } from "@tiptap/suggestion";
import { computePosition, flip, shift } from "@floating-ui/dom";

import type { Id } from "../../convex/_generated/dataModel";

import { AnimatePresence, motion } from "motion/react";

interface SearchInputProps {
  allTags: string[];
  onSearchChange: (query: string) => void;
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
  } | null;
  onCancelEditing?: () => void;
  isRefreshing?: boolean;
}

// Memoized Plus Button component
const SubmitButton = memo(function SubmitButton({
  onClick,
  disabled,
  isRefreshing,
}: {
  onClick: () => void;
  disabled: boolean;
  isRefreshing?: boolean;
}) {
  return (
    <div
      onClick={disabled ? undefined : onClick}
      className={`rounded-full cursor-pointer size-7 flex items-center justify-center transition-colors ${disabled ? "opacity-50" : "hover:bg-[#E5E6E6]"}`}
      style={{ backgroundColor: "#F2F3F3" }}
    >
      <AnimatePresence mode="popLayout">
        {isRefreshing ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.2 }}
          >
            <Loader size={17} color="#7a7a7a" className="animate-spin" />
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.2 }}
          >
            <Plus size={19} color="#7a7a7a" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

// Mention list ref interface
interface MentionListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

// Mention list props
interface MentionListProps {
  items: string[];
  command: (item: { id: string }) => void;
  query?: string;
}

// Mention suggestion list component - using forwardRef for imperative handle
const MentionList = forwardRef<MentionListRef, MentionListProps>(
  function MentionList({ items, command, query }, ref) {
    const [selectedIndex, setSelectedIndex] = useState(0);

    const hasItems = items.length > 0;
    const canCreateNew = !hasItems && query && query.trim() !== "";
    const totalItems = hasItems ? items.length : canCreateNew ? 1 : 0;

    const selectItem = useCallback(
      (index: number) => {
        if (hasItems) {
          const item = items[index];
          if (item) {
            command({ id: item });
          }
        } else if (canCreateNew) {
          command({ id: query! });
        }
      },
      [items, command, hasItems, canCreateNew, query]
    );

    useEffect(() => {
      setSelectedIndex(0);
    }, [items]);

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }: { event: KeyboardEvent }) => {
        if (event.key === "ArrowUp") {
          setSelectedIndex((prev) => (prev + totalItems - 1) % totalItems);
          return true;
        }
        if (event.key === "ArrowDown") {
          setSelectedIndex((prev) => (prev + 1) % totalItems);
          return true;
        }
        if (event.key === "Enter") {
          selectItem(selectedIndex);
          return true;
        }
        return false;
      },
    }));

    return (
      <div className="bg-white border gap-[0.1rem] border-stone-900/5 rounded-[0.7rem] shadow-[0_12px_33px_0_rgba(0,0,0,0.06),0_3.618px_9.949px_0_rgba(0,0,0,0.04)] flex flex-col overflow-auto p-[0.4rem] relative">
        {hasItems ? (
          items.map((item, index) => (
            <button
              className={`flex items-center gap-1 text-left w-full px-[10px] py-[6px] leading-[1.15] text-sm rounded-[8px] capitalize ${
                index === selectedIndex
                  ? "bg-[rgba(61,37,20,0.08)]"
                  : "hover:bg-[rgba(61,37,20,0.08)]"
              }`}
              key={item}
              onClick={() => selectItem(index)}
            >
              {item}
            </button>
          ))
        ) : canCreateNew ? (
          <button
            className={`flex items-center gap-1.5 text-left w-full pl-[10px] py-[6px] pr-[12px] leading-[1.15] text-sm rounded-[8px] capitalize text-blue-600 ${
              selectedIndex === 0
                ? "bg-[rgba(61,37,20,0.08)]"
                : "hover:bg-[rgba(61,37,20,0.08)]"
            }`}
            onClick={() => selectItem(0)}
          >
            <Plus size={14} className="shrink-0" />
            <span>{query}</span>
          </button>
        ) : (
          <div className="px-[10px] py-[6px] leading-[1.15] text-sm text-gray-500">
            No tags
          </div>
        )}
      </div>
    );
  }
);

// Helper to update the position of the mention popup using floating-ui
function updatePosition(
  editor: SuggestionProps["editor"],
  element: HTMLElement
) {
  const virtualElement = {
    getBoundingClientRect: () =>
      posToDOMRect(
        editor.view,
        editor.state.selection.from,
        editor.state.selection.to
      ),
  };

  computePosition(virtualElement, element, {
    placement: "bottom-start",
    strategy: "absolute",
    middleware: [shift(), flip()],
  }).then(({ x, y, strategy }) => {
    element.style.width = "max-content";
    element.style.position = strategy;
    element.style.left = `${x}px`;
    element.style.top = `${y}px`;
  });
}

// Create the mention suggestion configuration using a ref getter for fresh tags
function createMentionSuggestion(getTagsRef: () => string[]) {
  return {
    items: ({ query }: { query: string }) => {
      const tags = getTagsRef();
      return tags
        .filter((tag) => tag.toLowerCase().startsWith(query.toLowerCase()))
        .slice(0, 5);
    },
    render: () => {
      let reactRenderer: ReactRenderer<MentionListRef> | null = null;

      return {
        onStart: (props: SuggestionProps) => {
          if (!props.clientRect) return;

          reactRenderer = new ReactRenderer(MentionList, {
            props,
            editor: props.editor,
          });

          reactRenderer.element.style.position = "absolute";
          document.body.appendChild(reactRenderer.element);
          updatePosition(props.editor, reactRenderer.element);
        },
        onUpdate: (props: SuggestionProps) => {
          reactRenderer?.updateProps(props);

          if (!props.clientRect || !reactRenderer) return;
          updatePosition(props.editor, reactRenderer.element);
        },
        onKeyDown: (props: { event: KeyboardEvent }) => {
          if (props.event.key === "Escape") {
            reactRenderer?.destroy();
            reactRenderer?.element.remove();
            return true;
          }
          return reactRenderer?.ref?.onKeyDown(props) ?? false;
        },
        onExit: () => {
          reactRenderer?.destroy();
          reactRenderer?.element.remove();
        },
      };
    },
  };
}

// Extract text and mentions from editor content
type ContentPart =
  | { type: "text"; value: string }
  | { type: "mention"; id: string };

function extractContentFromEditor(editor: ReturnType<typeof useEditor>): {
  text: string;
  mentions: string[];
  parts: ContentPart[];
} {
  if (!editor) return { text: "", mentions: [], parts: [] };

  const json = editor.getJSON();
  let text = "";
  const mentions: string[] = [];
  const parts: ContentPart[] = [];

  function traverse(node: Record<string, unknown>) {
    if (node.type === "text" && typeof node.text === "string") {
      text += node.text;
      parts.push({ type: "text", value: node.text });
    } else if (
      node.type === "mention" &&
      node.attrs &&
      typeof (node.attrs as Record<string, unknown>).id === "string"
    ) {
      const id = (node.attrs as Record<string, unknown>).id as string;
      mentions.push(id);
      parts.push({ type: "mention", id });
    }
    if (Array.isArray(node.content)) {
      for (const child of node.content) {
        traverse(child as Record<string, unknown>);
      }
    }
  }

  if (json.content) {
    for (const node of json.content) {
      traverse(node as Record<string, unknown>);
    }
  }

  return { text: text.trim(), mentions, parts };
}

export const SearchInput = memo(function SearchInput({
  allTags,
  onSearchChange,
  onSubmit,
  editingBookmark,
  onCancelEditing,
  isRefreshing,
}: SearchInputProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitRef = useRef<(() => Promise<void>) | undefined>(undefined);
  const editingRef = useRef<typeof editingBookmark>(null);
  const hasFocusedOnceRef = useRef(false);

  // Use a ref to always access the latest tags without recreating the editor
  const tagsRef = useRef<string[]>(allTags);
  useEffect(() => {
    tagsRef.current = allTags;
  }, [allTags]);
  useEffect(() => {
    editingRef.current = editingBookmark ?? null;
  }, [editingBookmark]);

  // Create the mention suggestion once, using the ref getter
  const mentionSuggestion = useMemo(
    () => createMentionSuggestion(() => tagsRef.current),
    [] // Empty deps - the ref getter pattern means we don't need to recreate
  );

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        blockquote: false,
        codeBlock: false,
        horizontalRule: false,
      }),
      Mention.configure({
        HTMLAttributes: {
          class:
            "bg-[rgba(88,5,255,0.05)] rounded-[0.4rem] text-[#6a00f5] px-[0.3rem] py-[0.125rem] text-[15.5px] box-decoration-clone capitalize",
        },
        suggestion: mentionSuggestion,
      }),
    ],
    content: "",
    editorProps: {
      attributes: {
        class:
          "outline-none font-[var(--font-inter)] text-base leading-relaxed min-h-[1.5rem] flex-1",
      },
      handleKeyDown: (_view, event) => {
        if (event.key === "Enter" && event.metaKey) {
          event.preventDefault();
          submitRef.current?.();
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      const { text } = extractContentFromEditor(editor);
      onSearchChange(text);
    },
    immediatelyRender: false,
  });

  const handleSubmit = useCallback(async () => {
    if (!editor || isSubmitting) return;

    const { text, mentions, parts } = extractContentFromEditor(editor);

    // Check if the text looks like a URL
    const urlPattern = /^(https?:\/\/)?[\w.-]+\.[a-z]{2,}(\/\S*)?$/i;
    const firstMentionIndex = parts.findIndex(
      (part) => part.type === "mention"
    );
    let lastMentionIndex = -1;
    parts.forEach((part, index) => {
      if (part.type === "mention") lastMentionIndex = index;
    });

    const textBeforeFirstMention = (
      firstMentionIndex === -1 ? parts : parts.slice(0, firstMentionIndex)
    )
      .filter(
        (part): part is { type: "text"; value: string } => part.type === "text"
      )
      .map((part) => part.value)
      .join("");

    const urlCandidate =
      textBeforeFirstMention.trim().split(/\s+/).find(Boolean) ?? "";

    const titleFromInput =
      lastMentionIndex !== -1
        ? parts
            .slice(lastMentionIndex + 1)
            .filter(
              (part): part is { type: "text"; value: string } =>
                part.type === "text"
            )
            .map((part) => part.value)
            .join("")
            .trim()
        : (() => {
            const words = text.split(/\s+/).filter(Boolean);
            return words.slice(1).join(" ");
          })();

    if (!urlPattern.test(urlCandidate)) {
      // It's a search, not a URL submission
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(
        urlCandidate,
        mentions,
        titleFromInput || undefined,
        editingBookmark?.id
      );
      editor.commands.clearContent();
      onSearchChange("");
    } finally {
      setIsSubmitting(false);
    }
  }, [editor, isSubmitting, onSubmit, onSearchChange, editingBookmark?.id]);

  // Store handleSubmit in ref for keyboard shortcut
  useEffect(() => {
    submitRef.current = handleSubmit;
  }, [handleSubmit]);

  // Focus the editor on initial mount for quick input
  useEffect(() => {
    if (editor && !hasFocusedOnceRef.current) {
      editor.commands.focus("end");
      hasFocusedOnceRef.current = true;
    }
  }, [editor]);

  const cancelEditingAndClear = useCallback(() => {
    if (!editingRef.current) return;
    editor?.commands.clearContent();
    onSearchChange("");
    onCancelEditing?.();
  }, [editor, onCancelEditing, onSearchChange]);

  const handleEditorKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "Escape" && editingRef.current) {
        event.preventDefault();
        cancelEditingAndClear();
        return;
      }
    },
    [cancelEditingAndClear]
  );

  const setEditorContentFromBookmark = useCallback(
    (bookmark: NonNullable<SearchInputProps["editingBookmark"]>) => {
      if (!editor) return;

      const paragraphContent: Array<
        | { type: "text"; text: string }
        | { type: "mention"; attrs: { id: string } }
      > = [{ type: "text", text: bookmark.url }];

      for (const tag of bookmark.tags) {
        paragraphContent.push({ type: "text", text: " " });
        paragraphContent.push({ type: "mention", attrs: { id: tag } });
      }

      if (bookmark.title && bookmark.title.trim()) {
        paragraphContent.push({
          type: "text",
          text: ` ${bookmark.title.trim()}`,
        });
      }

      editor.commands.setContent({
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: paragraphContent,
          },
        ],
      });

      editor.commands.focus("end");
    },
    [editor]
  );

  useEffect(() => {
    if (editingBookmark) {
      setEditorContentFromBookmark(editingBookmark);
    }
  }, [editingBookmark, setEditorContentFromBookmark]);

  return (
    <div className="rounded-4xl [corner-shape:squircle] bg-[#FEFFFF] border border-[#ECEDED] w-[50%] h-28 px-5 py-5 flex flex-col justify-between">
      {/* Top row: Search icon + Input */}
      <div className="flex items-start gap-2">
        <Search size={17} color="gray" className="mt-1 shrink-0" />
        <EditorContent
          editor={editor}
          className="flex-1"
          onKeyDown={handleEditorKeyDown}
        />
      </div>

      {/* Bottom row: editing pill on left, plus button on right */}
      <div className="flex items-center justify-between">
        <div className="min-h-[28px] flex items-center">
          {editingBookmark ? (
            <div
              className="bg-[#F5F3FF] text-[#6A00F5] text-sm font-medium font-rounded px-2.75 py-1 rounded-full relative group cursor-pointer"
              onClick={cancelEditingAndClear}
            >
              Editing
              <div className="cursor-pointer absolute -right-2.5 -top-2 border-white border-2 p-0.75 rounded-full bg-[#F5F3FF] opacity-0 group-hover:opacity-100 transition-all duration-150">
                <X size={12} color="#6A00F5" strokeWidth={2.75} />
              </div>
            </div>
          ) : null}
        </div>
        <SubmitButton
          onClick={handleSubmit}
          disabled={isSubmitting}
          isRefreshing={isRefreshing}
        />
      </div>
    </div>
  );
});
