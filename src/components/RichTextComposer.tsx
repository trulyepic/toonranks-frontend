import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Superscript from "@tiptap/extension-superscript";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";
import { Node } from "@tiptap/core";
import { Markdown } from "tiptap-markdown";
import {
  Bold,
  Italic,
  Strikethrough,
  Superscript as SuperscriptIcon,
  Heading,
  Link as LinkIcon,
  List,
  ListOrdered,
  EyeOff,
  Quote,
  Code,
  SquareCode,
} from "lucide-react";
import type { ForumSeriesRef, UserSearchResult } from "../api/manApi";
import { forumSeriesSearch, searchUsers } from "../api/manApi";
import UserAvatar from "./UserAvatar";

/**
 * Collapsible spoiler support: <details><summary>…</summary>…</details>.
 * Serialized back to raw HTML in markdown (rendered on the site via rehype-raw).
 */
const DetailsSummary = Node.create({
  name: "detailsSummary",
  content: "text*",
  defining: true,
  selectable: false,
  parseHTML() {
    return [{ tag: "summary" }];
  },
  renderHTML() {
    return ["summary", 0];
  },
});

const Details = Node.create({
  name: "details",
  group: "block",
  content: "detailsSummary block+",
  defining: true,
  parseHTML() {
    return [{ tag: "details" }];
  },
  renderHTML() {
    return ["details", { open: "" }, 0];
  },
  addStorage() {
    return {
      markdown: {
        serialize(
          state: {
            write: (s: string) => void;
            render: (node: unknown, parent: unknown, index: number) => void;
            closeBlock: (node: unknown) => void;
            ensureNewLine: () => void;
          },
          node: {
            child: (i: number) => { textContent: string };
            childCount: number;
          }
        ) {
          const summary = node.child(0).textContent.trim() || "Spoiler";
          state.write(`<details><summary>${summary}</summary>\n\n`);
          for (let i = 1; i < node.childCount; i++) {
            state.render(node.child(i), node, i);
          }
          state.ensureNewLine();
          state.write("</details>");
          state.closeBlock(node);
        },
      },
    };
  },
});

/** <sup> support so the ^superscript toolbar button round-trips through markdown. */
const SuperscriptMarkdown = Superscript.extend({
  addStorage() {
    return {
      markdown: {
        serialize: { open: "<sup>", close: "</sup>", mixable: true },
      },
    };
  },
});

export type RichTextComposerHandle = {
  /** Insert an image at the caret. */
  insertImage: (url: string) => void;
  /** Insert a link (e.g. a shared reading list) at the caret. */
  insertLink: (text: string, href: string) => void;
  /** Current content serialized to markdown. */
  getMarkdown: () => string;
  focus: () => void;
};

type MentionHit = { from: number; to: number; query: string };

/** Find an "@query" token immediately before the caret in the current text block. */
function detectMention(editor: Editor): MentionHit | null {
  const { $from, empty } = editor.state.selection;
  if (!empty) return null;
  const textBefore = $from.parent.textBetween(0, $from.parentOffset, "￼");
  const m = textBefore.match(/(^|[\s([])@([^\s@]*)$/);
  if (!m) return null;
  const query = m[2];
  const tokenLen = query.length + 1; // include "@"
  const from = $from.pos - tokenLen;
  return { from, to: $from.pos, query };
}

const RichTextComposer = forwardRef<
  RichTextComposerHandle,
  {
    /** Initial markdown content (component is uncontrolled after mount). */
    initialMarkdown: string;
    /** Fired with the serialized markdown on every edit. */
    onChangeMarkdown: (md: string) => void;
    placeholder?: string;
    compact?: boolean;
    /** Toolbar hidden by default (Reddit-style); toggled via the Aa button. */
    showToolbar?: boolean;
    /** Renders a Reddit-style "Switch to Markdown" action in the toolbar. */
    onSwitchToMarkdown?: () => void;
  }
>(function RichTextComposer(
  {
    initialMarkdown,
    onChangeMarkdown,
    placeholder,
    compact = false,
    showToolbar = false,
    onSwitchToMarkdown,
  },
  ref
) {
  const [mentionHit, setMentionHit] = useState<MentionHit | null>(null);
  const [seriesResults, setSeriesResults] = useState<ForumSeriesRef[]>([]);
  const [userResults, setUserResults] = useState<UserSearchResult[]>([]);
  const [highlight, setHighlight] = useState(0);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const searchSeq = useRef(0);

  const editor = useEditor({
    // SSR: this app server-renders pages; render the editor client-side only.
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Link.configure({ openOnClick: false, autolink: true }),
      SuperscriptMarkdown,
      Image,
      Details,
      DetailsSummary,
      Placeholder.configure({ placeholder: placeholder ?? "Write something..." }),
      Markdown.configure({ html: true, linkify: true, breaks: true }),
    ],
    content: initialMarkdown,
    onUpdate: ({ editor }) => {
      onChangeMarkdown(editor.storage.markdown.getMarkdown());
      const hit = detectMention(editor);
      if (hit && hit.query.length >= 1) {
        setMentionHit(hit);
        runSearch(hit.query);
      } else {
        closeMenu();
      }
    },
    editorProps: {
      attributes: {
        class: `prose prose-sm max-w-none focus:outline-none dark:prose-invert ${
          compact ? "min-h-[2.5rem]" : "min-h-[3rem]"
        } px-4 py-3`,
      },
    },
  });

  function closeMenu() {
    setMentionHit(null);
    setSeriesResults([]);
    setUserResults([]);
    setHighlight(0);
  }

  async function runSearch(q: string) {
    const seq = ++searchSeq.current;
    try {
      const [series, users] = await Promise.all([
        forumSeriesSearch(q),
        searchUsers(q, 5),
      ]);
      if (seq !== searchSeq.current) return; // stale response
      setSeriesResults(series);
      setUserResults(users);
      setHighlight(0);
    } catch {
      if (seq === searchSeq.current) closeMenu();
    }
  }

  function pickSeries(r: ForumSeriesRef) {
    if (!editor || !mentionHit) return;
    editor
      .chain()
      .focus()
      .deleteRange({ from: mentionHit.from, to: mentionHit.to })
      .insertContent([
        {
          type: "text",
          text: r.title || `#${r.series_id}`,
          marks: [
            { type: "link", attrs: { href: `series:${r.series_id}` } },
          ],
        },
        { type: "text", text: " " },
      ])
      .run();
    closeMenu();
  }

  function pickUser(u: UserSearchResult) {
    if (!editor || !mentionHit) return;
    editor
      .chain()
      .focus()
      .deleteRange({ from: mentionHit.from, to: mentionHit.to })
      .insertContent(`@${u.username} `)
      .run();
    closeMenu();
  }

  const allItems = seriesResults.length + userResults.length;
  const menuOpen = mentionHit !== null && allItems > 0;

  useImperativeHandle(ref, () => ({
    insertImage: (url: string) =>
      editor?.chain().focus().setImage({ src: url }).run(),
    insertLink: (text: string, href: string) =>
      editor
        ?.chain()
        .focus()
        .insertContent([
          { type: "text", text, marks: [{ type: "link", attrs: { href } }] },
          { type: "text", text: " " },
        ])
        .run(),
    getMarkdown: () => editor?.storage.markdown.getMarkdown() ?? "",
    focus: () => editor?.chain().focus().run(),
  }));

  // Keyboard navigation for the mention menu (capture phase so the editor
  // doesn't consume Enter/arrows first).
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        e.stopPropagation();
        setHighlight((h) => (h + 1) % allItems);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        e.stopPropagation();
        setHighlight((h) => (h - 1 + allItems) % allItems);
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        e.stopPropagation();
        if (highlight < seriesResults.length) pickSeries(seriesResults[highlight]);
        else pickUser(userResults[highlight - seriesResults.length]);
      } else if (e.key === "Escape") {
        closeMenu();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  });

  useEffect(() => {
    const onDocClick = (ev: MouseEvent) => {
      if (!menuRef.current?.contains(ev.target as globalThis.Node)) closeMenu();
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const btnBase =
    "rounded p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-[#241d19] dark:hover:text-slate-100";
  const btnActive =
    "rounded bg-slate-200 p-1.5 text-slate-900 dark:bg-[#2c241d] dark:text-slate-50";

  function ToolButton({
    title,
    active,
    onClick,
    children,
  }: {
    title: string;
    active?: boolean;
    onClick: () => void;
    children: React.ReactNode;
  }) {
    return (
      <button
        type="button"
        title={title}
        aria-label={title}
        aria-pressed={active}
        onMouseDown={(e) => e.preventDefault()} // keep editor focus
        onClick={onClick}
        className={active ? btnActive : btnBase}
      >
        {children}
      </button>
    );
  }

  function handleLink() {
    if (!editor) return;
    if (editor.isActive("link")) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    const url = window.prompt("Enter URL:", "https://");
    if (!url) return;
    const { empty } = editor.state.selection;
    if (empty) {
      editor
        .chain()
        .focus()
        .insertContent([
          { type: "text", text: url, marks: [{ type: "link", attrs: { href: url } }] },
        ])
        .run();
    } else {
      editor.chain().focus().setLink({ href: url }).run();
    }
  }

  function handleSpoiler() {
    if (!editor) return;
    const { from, to, empty } = editor.state.selection;
    const inner = empty
      ? "hidden content"
      : editor.state.doc.textBetween(from, to, "\n");
    editor
      .chain()
      .focus()
      .insertContent({
        type: "details",
        content: [
          {
            type: "detailsSummary",
            content: [{ type: "text", text: "Spoiler" }],
          },
          {
            type: "paragraph",
            content: [{ type: "text", text: inner }],
          },
        ],
      })
      .run();
  }

  if (!editor) {
    // SSR / first client frame before the editor mounts.
    return (
      <div
        className={`${compact ? "min-h-[2.5rem]" : "min-h-[3rem]"} px-4 py-3 text-sm text-slate-400 dark:text-slate-500`}
      >
        Loading editor...
      </div>
    );
  }

  const iconSize = 16;

  return (
    <div className="relative">
      {/* Reddit-style toolbar pinned at the top of the box (shown via Aa toggle) */}
      {showToolbar && (
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5">
        <ToolButton
          title="Bold"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold size={iconSize} />
        </ToolButton>
        <ToolButton
          title="Italic"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic size={iconSize} />
        </ToolButton>
        <ToolButton
          title="Strikethrough"
          active={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <Strikethrough size={iconSize} />
        </ToolButton>
        <ToolButton
          title="Superscript"
          active={editor.isActive("superscript")}
          onClick={() => editor.chain().focus().toggleSuperscript().run()}
        >
          <SuperscriptIcon size={iconSize} />
        </ToolButton>
        <ToolButton
          title="Heading"
          active={editor.isActive("heading", { level: 3 })}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
        >
          <Heading size={iconSize} />
        </ToolButton>

        <span className="mx-1 h-4 w-px bg-slate-200 dark:bg-[#3a3028]" />

        <ToolButton
          title="Link"
          active={editor.isActive("link")}
          onClick={handleLink}
        >
          <LinkIcon size={iconSize} />
        </ToolButton>
        <ToolButton
          title="Bullet list"
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List size={iconSize} />
        </ToolButton>
        <ToolButton
          title="Numbered list"
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered size={iconSize} />
        </ToolButton>

        <span className="mx-1 h-4 w-px bg-slate-200 dark:bg-[#3a3028]" />

        <ToolButton
          title="Spoiler (collapsible)"
          active={editor.isActive("details")}
          onClick={handleSpoiler}
        >
          <EyeOff size={iconSize} />
        </ToolButton>
        <ToolButton
          title="Quote"
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote size={iconSize} />
        </ToolButton>
        <ToolButton
          title="Inline code"
          active={editor.isActive("code")}
          onClick={() => editor.chain().focus().toggleCode().run()}
        >
          <Code size={iconSize} />
        </ToolButton>
        <ToolButton
          title="Code block"
          active={editor.isActive("codeBlock")}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        >
          <SquareCode size={iconSize} />
        </ToolButton>

        {onSwitchToMarkdown && (
          <button
            type="button"
            onClick={onSwitchToMarkdown}
            className="ml-auto shrink-0 text-xs font-semibold text-slate-600 hover:underline dark:text-slate-300"
          >
            Switch to Markdown
          </button>
        )}
      </div>
      )}

      {/* Skinny by default; the corner handle lets users drag for more space. */}
      <div className="min-h-[3.25rem] resize-y overflow-y-auto">
        <EditorContent editor={editor} />
      </div>

      {menuOpen && (
        <div
          ref={menuRef}
          className="absolute left-2 right-2 top-full z-40 mt-1 max-h-60 overflow-auto rounded border border-slate-200 bg-white shadow dark:border-[#3a3028] dark:bg-[linear-gradient(145deg,_rgba(27,22,19,0.98),_rgba(21,17,14,0.98))]"
        >
          {seriesResults.length > 0 && (
            <>
              <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Series
              </div>
              {seriesResults.map((r, i) => (
                <button
                  key={r.series_id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pickSeries(r)}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left ${
                    i === highlight
                      ? "bg-gray-100 dark:bg-[#241d19]"
                      : "hover:bg-gray-50 dark:hover:bg-[#241d19]"
                  }`}
                  title={r.title || `#${r.series_id}`}
                >
                  {r.cover_url ? (
                    <img
                      src={r.cover_url}
                      alt={r.title || `Series #${r.series_id}`}
                      className="h-8 w-6 rounded object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <div className="h-8 w-6 rounded bg-gray-200 dark:bg-[#241d19]" />
                  )}
                  <div className="min-w-0">
                    <div className="truncate text-sm">{r.title}</div>
                    <div className="text-[11px] text-gray-500 dark:text-slate-400">
                      #{r.series_id}
                    </div>
                  </div>
                </button>
              ))}
            </>
          )}
          {userResults.length > 0 && (
            <>
              <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Users
              </div>
              {userResults.map((u, i) => {
                const idx = seriesResults.length + i;
                return (
                  <button
                    key={u.username}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pickUser(u)}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-left ${
                      idx === highlight
                        ? "bg-gray-100 dark:bg-[#241d19]"
                        : "hover:bg-gray-50 dark:hover:bg-[#241d19]"
                    }`}
                  >
                    <UserAvatar
                      username={u.username}
                      avatarUrl={u.avatar_url}
                      avatarPreset={u.avatar_preset}
                      size="sm"
                      className="h-6 w-6 shrink-0 text-[10px]"
                    />
                    <span className="truncate text-sm font-medium">
                      @{u.username}
                    </span>
                  </button>
                );
              })}
            </>
          )}
        </div>
      )}
    </div>
  );
});

export default RichTextComposer;
