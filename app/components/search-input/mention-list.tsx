"use client";

import {
  memo,
  forwardRef,
  useCallback,
  useEffect,
  useState,
  useImperativeHandle,
} from "react";
import { Plus } from "lucide-react";
import { ReactRenderer } from "@tiptap/react";
import type { SuggestionProps } from "@tiptap/suggestion";
import type { MentionListRef, MentionListProps } from "./types";
import { updateMentionPopupPosition } from "./utils";

export const MentionList = memo(
  forwardRef<MentionListRef, MentionListProps>(function MentionList(
    { items, command, query },
    ref
  ) {
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
  })
);

export function createMentionSuggestion(
  getTagsRef: () => string[],
  setTagChipsRef: React.RefObject<
    React.Dispatch<React.SetStateAction<string[]>>
  >
) {
  return {
    items: ({ query }: { query: string }) => {
      const tags = getTagsRef();
      return tags
        .filter((tag) => tag.toLowerCase().startsWith(query.toLowerCase()))
        .slice(0, 5);
    },
    command: ({
      editor,
      range,
      props,
    }: {
      editor: SuggestionProps["editor"];
      range: { from: number; to: number };
      props: { id: string | null };
    }) => {
      editor.chain().focus().deleteRange(range).run();
      if (props.id) {
        setTagChipsRef.current?.((prev) =>
          prev.includes(props.id!) ? prev : [...prev, props.id!]
        );
      }
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
          updateMentionPopupPosition(props.editor, reactRenderer.element);
        },
        onUpdate: (props: SuggestionProps) => {
          reactRenderer?.updateProps(props);
          if (!props.clientRect || !reactRenderer) return;
          updateMentionPopupPosition(props.editor, reactRenderer.element);
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
