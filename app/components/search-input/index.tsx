"use client";

import { memo, useCallback, useRef, useEffect, useState, useMemo } from "react";
import { Search, Plus, Loader } from "lucide-react";
import { useEditor, EditorContent } from "@tiptap/react";
import Link from "@tiptap/extension-link";
import StarterKit from "@tiptap/starter-kit";
import Mention from "@tiptap/extension-mention";
import { AnimatePresence, motion } from "motion/react";

import { useIsMobile } from "../../hooks/use-mobile";
import type { SearchInputProps } from "./types";
import { extractContentFromEditor, URL_PATTERN } from "./utils";
import { createMentionSuggestion } from "./mention-list";
import { ChipSeparator, TagChips, AnimatedChip } from "./chip";

const EDITOR_EXTENSIONS_BASE = StarterKit.configure({
  heading: false,
  bulletList: false,
  orderedList: false,
  listItem: false,
  blockquote: false,
  codeBlock: false,
  horizontalRule: false,
  link: false,
});

const LINK_EXTENSION = Link.configure({
  autolink: true,
  openOnClick: false,
  HTMLAttributes: {
    class: "text-blue-600 cursor-pointer hover:text-blue-600/80",
  },
});

const MENTION_HTML_ATTRIBUTES = {
  class:
    "bg-[rgba(88,5,255,0.05)] rounded-[0.4rem] text-[#6a00f5] font-geist px-[0.3rem] pr-[0.4rem] py-[0.125rem] text-[15.5px] box-decoration-clone capitalize",
};

export const SearchInput = memo(function SearchInput({
  allTags,
  onSearchChange,
  onClearSearch,
  onSubmit,
  editingBookmark,
  onCancelEditing,
  onDeleteEditing,
  onRefreshFavicon,
  isRefreshing,
}: SearchInputProps) {
  const isMobile = useIsMobile();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasContent, setHasContent] = useState(false);
  const [tagChips, setTagChips] = useState<string[]>([]);
  const [faviconRotationKey, setFaviconRotationKey] = useState(0);

  const submitRef = useRef<(() => Promise<void>) | undefined>(undefined);
  const editingRef = useRef<typeof editingBookmark>(null);
  const hasFocusedOnceRef = useRef(false);
  const tagsRef = useRef<string[]>(allTags);
  const setTagChipsRef = useRef(setTagChips);

  useEffect(() => {
    tagsRef.current = allTags;
  }, [allTags]);

  useEffect(() => {
    editingRef.current = editingBookmark ?? null;
  }, [editingBookmark]);

  useEffect(() => {
    setTagChipsRef.current = setTagChips;
  }, []);

  const mentionSuggestion = useMemo(
    () => createMentionSuggestion(() => tagsRef.current, setTagChipsRef),
    []
  );

  const editorExtensions = useMemo(
    () => [
      EDITOR_EXTENSIONS_BASE,
      Mention.configure({
        HTMLAttributes: MENTION_HTML_ATTRIBUTES,
        suggestion: mentionSuggestion,
      }),
      LINK_EXTENSION,
    ],
    [mentionSuggestion]
  );

  const editor = useEditor({
    extensions: editorExtensions,
    content: "",
    editorProps: {
      attributes: {
        class:
          "outline-none font-[var(--font-inter)] text-base leading-relaxed min-h-[1.5rem] flex-1",
        autocapitalize: "off",
        autocorrect: "off",
        spellCheck: "false",
        style: `font-weight: ${isMobile ? 500 : 420};`,
      },
      handleKeyDown: (_view, event) => {
        if (event.key === "Enter") {
          if (isMobile) return false;
          if (event.metaKey) {
            event.preventDefault();
            submitRef.current?.();
            return true;
          }
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      const { text } = extractContentFromEditor(editor);
      onSearchChange(text);
      setHasContent(text.length > 0);
    },
    immediatelyRender: false,
  });

  const handleSubmit = useCallback(async () => {
    if (!editor || isSubmitting) return;

    const { text } = extractContentFromEditor(editor);
    const words = text.split(/\s+/).filter(Boolean);
    const urlCandidate = words[0] ?? "";
    const titleFromInput = words.slice(1).join(" ");

    if (!URL_PATTERN.test(urlCandidate)) return;

    setIsSubmitting(true);
    try {
      editor.commands.clearContent();
      onSearchChange("");
      onClearSearch?.();
      setHasContent(false);

      await onSubmit(
        urlCandidate,
        tagChips,
        titleFromInput || undefined,
        editingBookmark?.id
      );
      setTagChips([]);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    editor,
    isSubmitting,
    onSubmit,
    onSearchChange,
    onClearSearch,
    editingBookmark?.id,
    tagChips,
  ]);

  useEffect(() => {
    submitRef.current = handleSubmit;
  }, [handleSubmit]);

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
    setHasContent(false);
    setTagChips([]);
  }, [editor, onCancelEditing, onSearchChange]);

  const handleEditorKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === "Escape" && editingRef.current) {
        event.preventDefault();
        cancelEditingAndClear();
      }
    },
    [cancelEditingAndClear]
  );

  const setEditorContentFromBookmark = useCallback(
    (bookmark: NonNullable<SearchInputProps["editingBookmark"]>) => {
      if (!editor) return;

      const urlText = bookmark.url;
      const content: Array<{
        type: "text";
        text: string;
        marks?: Array<{ type: "link"; attrs: { href: string } }>;
      }> = [
        {
          type: "text",
          text: urlText,
          marks: urlText
            ? [{ type: "link", attrs: { href: urlText } }]
            : undefined,
        },
      ];

      if (bookmark.title?.trim()) {
        content.push({ type: "text", text: ` ${bookmark.title.trim()}` });
      }

      editor.commands.setContent({
        type: "doc",
        content: [{ type: "paragraph", content }],
      });

      setTagChips(bookmark.tags);
      editor.commands.focus("end");
      setHasContent(true);
    },
    [editor]
  );

  useEffect(() => {
    if (editingBookmark) {
      setEditorContentFromBookmark(editingBookmark);
    }
  }, [editingBookmark, setEditorContentFromBookmark]);

  const handleRemoveTag = useCallback((tag: string) => {
    setTagChips((prev) => prev.filter((t) => t !== tag));
  }, []);

  const handleRefreshFavicon = useCallback(() => {
    setFaviconRotationKey((k) => k + 1);
    onRefreshFavicon?.();
  }, [onRefreshFavicon]);

  const handleDelete = useCallback(() => {
    onDeleteEditing?.();
    cancelEditingAndClear();
  }, [onDeleteEditing, cancelEditingAndClear]);

  const showEditingChips = editingBookmark && hasContent;
  const showSeparator = showEditingChips && tagChips.length > 0;

  return (
    <div className="rounded-4xl [corner-shape:squircle] bg-[#FEFFFF] border-shadow w-[85%] md:max-w-[50%] px-5 py-5 flex flex-col gap-4">
      {/* Top row: fixed height, search icon always visible */}
      <div className="flex items-start gap-2 min-h-6.5">
        <div className="size-[17px] mt-1 shrink-0 flex items-center justify-center">
          <Search size={17} color="gray" />
        </div>
        <EditorContent
          editor={editor}
          className="flex-1 whitespace-pre-wrap break-all"
          onKeyDown={handleEditorKeyDown}
          autoCorrect="off"
          spellCheck={false}
        />
      </div>

      {/* Bottom row: fixed height to prevent layout shift */}
      <div className="flex items-center justify-between min-h-7">
        <div className="flex items-center gap-2 flex-wrap">
          <AnimatePresence initial={false}>
            {showEditingChips ? (
              <AnimatedChip
                key="editing-chip"
                variant="editing"
                label="Editing"
                onClick={cancelEditingAndClear}
              />
            ) : null}
          </AnimatePresence>

          <AnimatePresence initial={false}>
            {showEditingChips ? (
              <AnimatedChip
                key="favicon-chip"
                variant="favicon"
                label="Favicon"
                onClick={handleRefreshFavicon}
                showRefreshIcon
                rotationKey={faviconRotationKey}
                whileTap
              />
            ) : null}
          </AnimatePresence>

          <ChipSeparator visible={!!showSeparator} />

          <TagChips tags={tagChips} onRemove={handleRemoveTag} />

          <AnimatePresence initial={false}>
            {showEditingChips ? (
              <motion.div
                key="delete-chip"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="md:hidden"
              >
                <div
                  className="bg-[#FFF0F0] text-[#FD2B38] text-sm font-medium font-rounded px-2.75 py-1 rounded-full cursor-pointer"
                  onClick={handleDelete}
                >
                  Delete
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        {/* Submit button: fixed size container */}
        <div
          onClick={isSubmitting ? undefined : handleSubmit}
          className={`rounded-full cursor-pointer size-7 shrink-0 flex items-center justify-center bg-[#F2F3F3] transition-colors ${
            isSubmitting ? "opacity-50" : "hover:bg-[#E5E6E6]"
          }`}
        >
          {isRefreshing ? (
            <Loader size={19} color="#7a7a7a" className="animate-spin" />
          ) : (
            <Plus size={19} color="#7a7a7a" />
          )}
        </div>
      </div>
    </div>
  );
});
