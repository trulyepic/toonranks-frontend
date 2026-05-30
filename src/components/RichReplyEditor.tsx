import { useEffect, useRef, useState } from "react";
import type { ForumSeriesRef, ReadingList } from "../api/manApi";
import {
  forumSeriesSearch,
  getMyReadingLists,
  uploadForumMedia,
} from "../api/manApi";
import { useUser } from "../login/useUser";
import { useNotice } from "../hooks/useNotice";
import { NoticeModal } from "./NoticeModal";

export default function RichReplyEditor({
  onSubmit,
  compact = false,
  initial = "",
  mode = "reply",
  onCancel,
  threadId,
  editingPostId = null,
}: {
  onSubmit: (content: string, seriesIds: number[]) => Promise<void> | void;
  compact?: boolean;
  initial?: string;
  mode?: "reply" | "edit";
  onCancel?: () => void;
  threadId: number;
  editingPostId?: number | null;
}) {
  const { user } = useUser();

  const [value, setValue] = useState(initial);
  const [results, setResults] = useState<ForumSeriesRef[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [mentionStart, setMentionStart] = useState<number | null>(null);

  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const fileRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  const listMenuRef = useRef<HTMLDivElement | null>(null);
  const [listMenuOpen, setListMenuOpen] = useState(false);
  const [lists, setLists] = useState<ReadingList[]>([]);
  const [listsLoading, setListsLoading] = useState(false);

  const notice = useNotice();
  const MAX_MENTIONS = 10;
  const MAX_POST_LENGTH = 10_000;

  // ── Draft auto-save (reply mode only) ─────────────────────────────────────
  const draftKey = mode === "reply" ? `forum_draft_thread_${threadId}` : null;
  const [draftSaved, setDraftSaved] = useState(false);

  // Restore draft on first mount (reply mode only)
  useEffect(() => {
    if (!draftKey) return;
    const saved = localStorage.getItem(draftKey);
    if (saved) setValue(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey]);

  // Save draft on change (debounced 1 s)
  useEffect(() => {
    if (!draftKey) return;
    const timer = setTimeout(() => {
      if (value.trim()) {
        localStorage.setItem(draftKey, value);
        setDraftSaved(true);
        setTimeout(() => setDraftSaved(false), 2000);
      } else {
        localStorage.removeItem(draftKey);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [value, draftKey]);

  const toolbarButtonClass =
    "rounded border border-slate-200 px-2 py-1 text-slate-700 hover:bg-gray-50 dark:border-[#3a3028] dark:text-slate-200 dark:hover:bg-[#241d19]";

  const insertAtCaret = (text: string) => {
    const el = taRef.current;
    if (!el) return setValue((v) => v + text);
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const next = value.slice(0, start) + text + value.slice(end);
    setValue(next);
    queueMicrotask(() => {
      el.focus();
      const pos = start + text.length;
      el.setSelectionRange(pos, pos);
    });
  };

  type ApiErrorPayload = {
    detail?: string | { message?: string };
    message?: string;
  };

  function getErrorMessage(
    e: unknown,
    fallback = "Failed to post reply."
  ): string {
    if (typeof e === "string") return e;
    if (e instanceof Error) return e.message;
    if (typeof e === "object" && e !== null) {
      const resp = (e as { response?: { data?: ApiErrorPayload } }).response;
      const data = resp?.data;
      const detail = data?.detail;
      if (typeof detail === "string") return detail;
      if (detail && typeof detail === "object" && "message" in detail) {
        const msg = (detail as { message?: unknown }).message;
        if (typeof msg === "string") return msg;
      }
      const msg = (e as { message?: unknown }).message;
      if (typeof msg === "string") return msg;
    }
    return fallback;
  }

  const wrapSelection = (left: string, right = left) => {
    const el = taRef.current;
    if (!el) return;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const before = value.slice(0, start);
    const sel = value.slice(start, end);
    const after = value.slice(end);
    const next = `${before}${left}${sel}${right}${after}`;
    setValue(next);
    queueMicrotask(() => {
      el.focus();
      const cursorStart = start + left.length;
      el.setSelectionRange(cursorStart, cursorStart + sel.length);
    });
  };

  const extractIds = (text: string) =>
    Array.from(text.matchAll(/\(series:(\d+)\)/g)).map((m) => Number(m[1]));

  function detectAtToken(nextValue: string, caret: number) {
    if (caret < 0 || caret > nextValue.length) return null;
    const before = nextValue.slice(0, caret);
    const lastBoundary = Math.max(
      before.lastIndexOf(" "),
      before.lastIndexOf("\n"),
      before.lastIndexOf("\t"),
      before.lastIndexOf("("),
      before.lastIndexOf("[")
    );
    const tokenStart = lastBoundary + 1;
    const token = nextValue.slice(tokenStart, caret);
    if (!token.startsWith("@")) return null;
    const after = nextValue.slice(caret);
    const m = after.match(/^[^\s.,!?)]*/);
    const tokenEnd = caret + (m ? m[0].length : 0);
    const wholeToken = nextValue.slice(tokenStart, tokenEnd);
    const query = wholeToken.slice(1);
    return { tokenStart, tokenEnd, query };
  }

  async function runMentionSearch(q: string) {
    try {
      const r = await forumSeriesSearch(q);
      setResults(r);
      setHighlight(0);
      setMenuOpen(r.length > 0);
    } catch {
      setResults([]);
      setMenuOpen(false);
    }
  }

  function insertMention(
    chosen: ForumSeriesRef,
    tokenStart: number,
    tokenEnd: number
  ) {
    const currentIds = Array.from(new Set(extractIds(value)));
    if (currentIds.length >= MAX_MENTIONS) {
      alert(`You can mention up to ${MAX_MENTIONS} series per reply.`);
      setMenuOpen(false);
      return;
    }
    const before = value.slice(0, tokenStart);
    const after = value.slice(tokenEnd);
    const inserted = `[${chosen.title || `#${chosen.series_id}`}](series:${
      chosen.series_id
    })`;
    const next = `${before}${inserted}${after}`;
    setValue(next);
    setMenuOpen(false);
    setResults([]);
    setMentionStart(null);
    queueMicrotask(() => {
      taRef.current?.focus();
      const newPos = (before + inserted).length;
      taRef.current?.setSelectionRange(newPos, newPos);
    });
  }

  const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const next = e.target.value;
    setValue(next);
    const caret = e.target.selectionStart ?? next.length;
    const hit = detectAtToken(next, caret);
    if (hit && hit.query.length >= 1) {
      setMentionStart(hit.tokenStart);
      runMentionSearch(hit.query);
    } else {
      setMentionStart(null);
      setMenuOpen(false);
      setResults([]);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!menuOpen || results.length === 0 || mentionStart === null) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => (h + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => (h - 1 + results.length) % results.length);
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      const caret = taRef.current?.selectionStart ?? value.length;
      const hit = detectAtToken(value, caret);
      const start = hit ? hit.tokenStart : mentionStart;
      const end = hit ? hit.tokenEnd : caret;
      insertMention(results[highlight], start, end);
    } else if (e.key === "Escape") {
      setMenuOpen(false);
      setResults([]);
      setMentionStart(null);
    }
  };

  useEffect(() => {
    const onDocClick = (ev: MouseEvent) => {
      const target = ev.target as Node;
      const clickedTextarea =
        taRef.current === target || !!taRef.current?.contains(target);
      const clickedMentionMenu = !!menuRef.current?.contains(target);
      const clickedListMenu = !!listMenuRef.current?.contains(target);
      if (!clickedTextarea && !clickedMentionMenu) setMenuOpen(false);
      if (!clickedTextarea && !clickedListMenu) setListMenuOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const handlePrimary = async () => {
    const trimmed = value.trim();
    if (!trimmed) {
      notice.show({
        message:
          mode === "edit"
            ? "Content cannot be empty."
            : "Reply cannot be empty.",
        title: "Can't post",
        variant: "warning",
      });
      return;
    }
    if (value.length > MAX_POST_LENGTH) {
      notice.show({
        message: `Reply is too long (${value.length.toLocaleString()} / ${MAX_POST_LENGTH.toLocaleString()} characters).`,
        title: "Too long",
        variant: "warning",
      });
      return;
    }
    const ids = Array.from(new Set(extractIds(trimmed)));

    if (mode === "reply") {
      if (!user) {
        notice.show({
          message: "You need to be logged in to post a reply.",
          title: "Sign in required",
          variant: "warning",
        });
        return;
      }
      if (ids.length > MAX_MENTIONS) {
        notice.show({
          message: `You can mention up to ${MAX_MENTIONS} series per reply.`,
          title: "Limit reached",
          variant: "warning",
        });
        return;
      }
    }

    try {
      await onSubmit(trimmed, ids);
      if (mode === "reply") {
        setValue("");
        setResults([]);
        setMenuOpen(false);
        setMentionStart(null);
        // Clear draft on successful post
        if (draftKey) localStorage.removeItem(draftKey);
      }
    } catch (err: unknown) {
      alert(
        getErrorMessage(
          err,
          mode === "edit" ? "Failed to save." : "Failed to post reply."
        )
      );
    }
  };

  async function handlePickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;

    const mime = (f.type || "").toLowerCase();
    const isGif = mime === "image/gif";
    const maxBytes = isGif ? 1_048_576 : 307_200;
    if (f.size > maxBytes) {
      notice.show({
        message: isGif
          ? "GIF too large (max 1 MB)."
          : "Image too large (max 300 KB).",
        title: "Upload blocked",
        variant: "warning",
      });
      e.currentTarget.value = "";
      return;
    }

    try {
      setUploading(true);
      const { url } = await uploadForumMedia(
        threadId,
        f,
        editingPostId ?? undefined
      );
      insertAtCaret(`![](${url})`);
    } catch (err: unknown) {
      notice.show({
        message: getErrorMessage(err, "Upload failed."),
        title: "Upload failed",
        variant: "error",
      });
    } finally {
      setUploading(false);
      e.currentTarget.value = "";
    }
  }

  return (
    <div
      className={`relative rounded ${
        compact
          ? "bg-gray-50 dark:bg-[linear-gradient(145deg,_rgba(22,18,15,0.96),_rgba(18,15,12,0.96))]"
          : "bg-white dark:bg-[linear-gradient(145deg,_rgba(27,22,19,0.98),_rgba(21,17,14,0.98))]"
      }`}
    >
      <div className="relative mb-2 flex items-center gap-2 text-sm">
        <button
          type="button"
          className={toolbarButtonClass}
          onClick={() => wrapSelection("**")}
          title="Bold (**text**)"
        >
          B
        </button>
        <button
          type="button"
          className={`${toolbarButtonClass} italic`}
          onClick={() => wrapSelection("*")}
          title="Italic (*text*)"
        >
          I
        </button>
        <button
          type="button"
          className={toolbarButtonClass}
          onClick={() => fileRef.current?.click()}
          title="Add image or GIF"
        >
          + Image/GIF
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={handlePickFile}
        />
        {uploading && (
          <span className="text-xs text-gray-500 dark:text-slate-400">
            Uploading...
          </span>
        )}

        <button
          type="button"
          className={toolbarButtonClass}
          title="Insert a link to one of your reading lists"
          onClick={async () => {
            if (!user) {
              alert("Log in to share a list.");
              return;
            }
            setListMenuOpen((o) => !o);
            if (!lists.length) {
              try {
                setListsLoading(true);
                const data = await getMyReadingLists();
                setLists(data);
              } finally {
                setListsLoading(false);
              }
            }
          }}
        >
          List
        </button>

        {listMenuOpen && (
          <div
            ref={listMenuRef}
            onMouseDown={(e) => e.stopPropagation()}
            className="absolute left-0 top-8 z-50 w-80 rounded border border-slate-200 bg-white shadow dark:border-[#3a3028] dark:bg-[linear-gradient(145deg,_rgba(27,22,19,0.98),_rgba(21,17,14,0.98))]"
          >
            {listsLoading ? (
              <div className="px-3 py-2 text-sm text-gray-500 dark:text-slate-400">
                Loading...
              </div>
            ) : lists.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500 dark:text-slate-400">
                No lists yet.
              </div>
            ) : (
              <div className="py-1">
                {lists.map((l) => {
                  const shareable = l.is_public && !!l.share_token;
                  const base =
                    "w-full flex items-center gap-2 px-3 py-2 text-left truncate";
                  return (
                    <button
                      key={l.id}
                      type="button"
                      disabled={!shareable}
                      title={
                        shareable
                          ? "Insert public list"
                          : "This list is private. Open My Reading Lists and click Share."
                      }
                      onClick={() => {
                        if (!shareable) {
                          alert(
                            "This list is private.\nOpen My Reading Lists -> Share to create a public link."
                          );
                          return;
                        }
                        insertAtCaret(`[${l.name}](/lists/${l.share_token})`);
                        setListMenuOpen(false);
                      }}
                      className={
                        base +
                        " " +
                        (shareable
                          ? "hover:bg-gray-50 dark:hover:bg-[#241d19]"
                          : "opacity-60 cursor-not-allowed")
                      }
                    >
                      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                        Link
                      </span>
                      <span className="min-w-0 flex-1 truncate">{l.name}</span>
                      {!shareable && (
                        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-600 dark:bg-[#241d19] dark:text-slate-300">
                          Private
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <span className="ml-2 text-xs text-gray-500 dark:text-slate-400">
          Markdown + type <span className="font-semibold">@</span> to mention a
          series · <span className="font-medium">PNG/JPEG/WebP &lt;= 300 KB</span>{" "}
          (&lt;=1024x1024), <span className="font-medium">GIF &lt;= 1 MB</span>{" "}
          (&lt;=512x512)
        </span>
      </div>

      <textarea
        ref={taRef}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        placeholder={
          mode === "edit"
            ? "Edit your content..."
            : "Write a reply... (try typing @series title to mention/ref a series)"
        }
        className="h-28 w-full rounded border border-slate-200 bg-white px-3 py-2 text-slate-800 dark:border-[#3a3028] dark:bg-[linear-gradient(145deg,_rgba(22,18,15,0.98),_rgba(18,15,12,0.98))] dark:text-slate-100"
      />
      <div className="flex items-center justify-between mt-1">
        {draftSaved && (
          <span className="text-[11px] text-slate-400 dark:text-slate-500 italic">
            Draft saved
          </span>
        )}
        {!draftSaved && <span />}
        <span
          className={`text-xs ${
            value.length > MAX_POST_LENGTH
              ? "text-red-500 font-medium"
              : "text-slate-400 dark:text-slate-500"
          }`}
        >
          {value.length.toLocaleString()} / {MAX_POST_LENGTH.toLocaleString()}
        </span>
      </div>

      {menuOpen && results.length > 0 && (
        <div
          ref={menuRef}
          className="absolute left-2 right-2 top-full z-40 mt-1 max-h-60 overflow-auto rounded border border-slate-200 bg-white shadow dark:border-[#3a3028] dark:bg-[linear-gradient(145deg,_rgba(27,22,19,0.98),_rgba(21,17,14,0.98))]"
        >
          {results.map((r, i) => (
            <button
              key={r.series_id}
              type="button"
              onClick={() => {
                const caret = taRef.current?.selectionStart ?? value.length;
                const hit = detectAtToken(value, caret);
                const start = hit ? hit.tokenStart : mentionStart ?? caret;
                const end = hit ? hit.tokenEnd : caret;
                insertMention(r, start, end);
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-left ${
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
        </div>
      )}

      {extractIds(value).length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {Array.from(new Set(extractIds(value))).map((id) => (
            <span
              key={id}
              className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700"
            >
              #{id}
            </span>
          ))}
        </div>
      )}

      <div className="mt-3 flex justify-end gap-2">
        {mode === "edit" ? (
          <>
            <button
              onClick={onCancel}
              className="rounded border border-slate-200 bg-white px-3 py-1.5 dark:border-[#3a3028] dark:bg-[linear-gradient(145deg,_rgba(25,21,18,0.96),_rgba(20,17,14,0.96))] dark:text-slate-200 dark:hover:bg-[#241d19]"
            >
              Cancel
            </button>
            <button
              onClick={handlePrimary}
              disabled={value.length > MAX_POST_LENGTH}
              className="rounded bg-blue-600 px-3 py-1.5 text-white disabled:opacity-50 dark:bg-[linear-gradient(145deg,_rgba(51,93,195,0.96),_rgba(34,73,170,0.96))] dark:hover:bg-[linear-gradient(145deg,_rgba(69,109,209,0.96),_rgba(48,86,184,0.96))]"
            >
              Save
            </button>
          </>
        ) : (
          <button
            onClick={handlePrimary}
            disabled={value.length > MAX_POST_LENGTH}
            className="rounded bg-blue-600 px-3 py-1.5 text-white disabled:opacity-50 dark:bg-[linear-gradient(145deg,_rgba(51,93,195,0.96),_rgba(34,73,170,0.96))] dark:hover:bg-[linear-gradient(145deg,_rgba(69,109,209,0.96),_rgba(48,86,184,0.96))]"
          >
            Post Reply
          </button>
        )}
      </div>

      <NoticeModal
        open={notice.open}
        title={notice.title}
        message={notice.message}
        variant={notice.variant}
        onClose={notice.hide}
      />
    </div>
  );
}
