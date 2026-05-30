import type React from "react";

interface MarkdownToolbarProps {
  /** Ref to the textarea being formatted */
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  /** Current textarea value */
  value: string;
  /** Called with the new value after a format action */
  onChange: (newValue: string) => void;
}

/**
 * Horizontal scrollable markdown formatting toolbar.
 * Works with any <textarea> via ref — no editor framework needed.
 */
export default function MarkdownToolbar({
  textareaRef,
  value,
  onChange,
}: MarkdownToolbarProps) {
  const btn =
    "shrink-0 rounded border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50 dark:border-[#3a3028] dark:text-slate-200 dark:hover:bg-[#241d19]";

  /** Wrap the current selection (or insert placeholder) with left/right tokens. */
  function wrapSelection(left: string, right = left, placeholder = "text") {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const sel = value.slice(start, end) || placeholder;
    const next =
      value.slice(0, start) + left + sel + right + value.slice(end);
    onChange(next);
    queueMicrotask(() => {
      el.focus();
      const s = start + left.length;
      el.setSelectionRange(s, s + sel.length);
    });
  }

  /** Prefix every line in the selection (or current line) with a string. */
  function prefixLines(prefix: string, placeholder = "item") {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const sel = value.slice(start, end).trim();
    const lines = sel ? sel.split("\n") : [placeholder];
    const prefixed = lines.map((l) => `${prefix}${l}`).join("\n");
    const next = value.slice(0, start) + prefixed + value.slice(end);
    onChange(next);
    queueMicrotask(() => {
      el.focus();
      el.setSelectionRange(start, start + prefixed.length);
    });
  }

  /** Insert a block at the cursor (replaces selection). */
  function insert(text: string) {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const next = value.slice(0, start) + text + value.slice(end);
    onChange(next);
    queueMicrotask(() => {
      el.focus();
      el.setSelectionRange(start + text.length, start + text.length);
    });
  }

  function handleLink() {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const sel = value.slice(start, end) || "link text";
    const url = window.prompt("Enter URL:", "https://");
    if (!url) return;
    const md = `[${sel}](${url})`;
    const next = value.slice(0, start) + md + value.slice(end);
    onChange(next);
    queueMicrotask(() => {
      el.focus();
      el.setSelectionRange(start, start + md.length);
    });
  }

  const actions: {
    label: string;
    title: string;
    className?: string;
    action: () => void;
  }[] = [
    {
      label: "B",
      title: "Bold",
      className: "font-bold",
      action: () => wrapSelection("**"),
    },
    {
      label: "I",
      title: "Italic",
      className: "italic",
      action: () => wrapSelection("*"),
    },
    {
      label: "S̶",
      title: "Strikethrough",
      action: () => wrapSelection("~~"),
    },
    {
      label: "🔗",
      title: "Link",
      action: handleLink,
    },
    {
      label: "`•`",
      title: "Inline code",
      action: () => wrapSelection("`", "`", "code"),
    },
    {
      label: "```",
      title: "Code block",
      action: () => wrapSelection("```\n", "\n```", "code"),
    },
    {
      label: "❝",
      title: "Blockquote",
      action: () => prefixLines("> "),
    },
    {
      label: "•—",
      title: "Unordered list",
      action: () => prefixLines("- "),
    },
    {
      label: "1.",
      title: "Ordered list",
      action: () => prefixLines("1. "),
    },
    {
      label: "👁",
      title: "Spoiler (collapsible)",
      action: () => {
        const el = textareaRef.current;
        if (!el) return;
        const start = el.selectionStart ?? 0;
        const end = el.selectionEnd ?? 0;
        const sel = value.slice(start, end).trim() || "hidden content";
        const block = `<details><summary>Spoiler</summary>\n\n${sel}\n\n</details>`;
        insert(block);
      },
    },
  ];

  return (
    <div className="overflow-x-auto pb-1">
      <div className="flex items-center gap-1 text-sm">
        {actions.map(({ label, title, className, action }) => (
          <button
            key={title}
            type="button"
            title={title}
            onClick={action}
            className={`${btn}${className ? ` ${className}` : ""}`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
