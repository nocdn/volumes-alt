import type { useEditor } from "@tiptap/react";
import { posToDOMRect } from "@tiptap/react";
import { computePosition, flip, shift } from "@floating-ui/dom";
import type { SuggestionProps } from "@tiptap/suggestion";
import type { ContentPart } from "./types";

export function extractContentFromEditor(
  editor: ReturnType<typeof useEditor>
): {
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

export function updateMentionPopupPosition(
  editor: SuggestionProps["editor"],
  element: HTMLElement
): void {
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

export const URL_PATTERN = /^(https?:\/\/)?[\w.-]+\.[a-z]{2,}(\/\S*)?$/i;
