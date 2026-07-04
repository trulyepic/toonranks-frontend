import { useEffect, useRef, useState } from "react";
import { ImagePlus, ListPlus } from "lucide-react";
import RichTextComposer, {
  type RichTextComposerHandle,
} from "./RichTextComposer";
import type { ForumSeriesRef, ReadingList, UserSearchResult } from "../api/manApi";
import {
  forumSeriesSearch,
  getMyReadingLists,
  uploadForumMedia,
  searchUsers,
} from "../api/manApi";
import UserAvatar from "./UserAvatar";
import { useUser } from "../login/useUser";
import { useNotice } from "../hooks/useNotice";
import { NoticeModal } from "./NoticeModal";

export default function RichReplyEditor({
  onSubmit,
  initial = "",
  mode = "reply",
  onCancel,
  threadId,
  editingPostId = null,
  compact = false,
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
  // Reddit-style editor: rich text (WYSIWYG) by default, with a raw-markdown
  // fallback. The choice is remembered across sessions.
  const [editorMode, setEditorMode] = useState<"rich" | "markdown">(() => {
    if (typeof window === "undefined") return "rich";
    return localStorage.getItem("forum_editor_mode") === "markdown"
      ? "markdown"
      : "rich";
  });
  // Formatting toolbar is hidden by default (minimal Reddit-style box);
  // revealed via the Aa button in the footer.
  const [showToolbar, setShowToolbar] = useState(false);
  // Remount the rich composer (re-reading `value`) each time we switch back.
  const [composerKey, setComposerKey] = useState(0);
  const composerRef = useRef<RichTextComposerHandle | null>(null);

  const switchMode = (mode: "rich" | "markdown") => {
    if (mode === "rich") setComposerKey((k) => k + 1);
    setEditorMode(mode);
    localStorage.setItem("forum_editor_mode", mode);
  };
  const [results, setResults] = useState<ForumSeriesRef[]>([]);
  const [userResults, setUserResults] = useState<UserSearchResult[]>([]);
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

  // Restore draft on first mount (reply mode only). Remount the rich composer
  // so it picks up the restored markdown.
  useEffect(() => {
    if (!draftKey) return;
    const saved = localStorage.getItem(draftKey);
    if (saved) {
      setValue(saved);
      setComposerKey((k) => k + 1);
    }
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
    "rounded p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-[#241d19] dark:hover:text-slate-100";
  // Borderless: the textarea sits inside the shared editor box.
  const textareaClassName = compact
    ? "h-14 min-h-[3.5rem] w-full resize-y bg-transparent px-3 py-2.5 font-mono text-sm text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
    : "h-16 min-h-[4rem] w-full resize-y bg-transparent px-4 py-3 font-mono text-sm text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500";
  // Small footer pills so the actions sit quietly inside the box (Reddit-style).
  const primaryButtonClassName =
    "rounded-full bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white disabled:opacity-50 dark:bg-[linear-gradient(145deg,_rgba(51,93,195,0.96),_rgba(34,73,170,0.96))] dark:hover:bg-[linear-gradient(145deg,_rgba(69,109,209,0.96),_rgba(48,86,184,0.96))]";
  const secondaryButtonClassName =
    "rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-[#3a3028] dark:bg-[linear-gradient(145deg,_rgba(25,21,18,0.96),_rgba(20,17,14,0.96))] dark:text-slate-200 dark:hover:bg-[#241d19]";

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
    // allSettled so one failing endpoint doesn't blank the other's results —
    // Promise.all here made a single failure silently kill the whole menu.
    const [series, users] = await Promise.allSettled([
      forumSeriesSearch(q),
      searchUsers(q, 5),
    ]);
    const seriesOk = series.status === "fulfilled" ? series.value : [];
    const usersOk = users.status === "fulfilled" ? users.value : [];
    if (series.status === "rejected" && users.status === "rejected") {
      console.warn("[mentions] both search endpoints failed", series.reason);
    }
    setResults(seriesOk);
    setUserResults(usersOk);
    setHighlight(0);
    setMenuOpen(seriesOk.length > 0 || usersOk.length > 0);
  }

  function insertUserMention(
    user: UserSearchResult,
    tokenStart: number,
    tokenEnd: number
  ) {
    const before = value.slice(0, tokenStart);
    const after = value.slice(tokenEnd);
    const inserted = `@${user.username}`;
    const next = `${before}${inserted}${after}`;
    setValue(next);
    setMenuOpen(false);
    setResults([]);
    setUserResults([]);
    setMentionStart(null);
    queueMicrotask(() => {
      taRef.current?.focus();
      const newPos = (before + inserted).length;
      taRef.current?.setSelectionRange(newPos, newPos);
    });
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
    setUserResults([]);
    setMentionStart(null);
    queueMicrotask(() => {
      taRef.current?.focus();
      const newPos = (before + inserted).length;
      taRef.current?.setSelectionRange(newPos, newPos);
    });
  }

  const allItems = results.length + userResults.length;

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
      setUserResults([]);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!menuOpen || allItems === 0 || mentionStart === null) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => (h + 1) % allItems);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => (h - 1 + allItems) % allItems);
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      const caret = taRef.current?.selectionStart ?? value.length;
      const hit = detectAtToken(value, caret);
      const start = hit ? hit.tokenStart : mentionStart;
      const end = hit ? hit.tokenEnd : caret;
      if (highlight < results.length) {
        insertMention(results[highlight], start, end);
      } else {
        insertUserMention(userResults[highlight - results.length], start, end);
      }
    } else if (e.key === "Escape") {
      setMenuOpen(false);
      setResults([]);
      setUserResults([]);
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
        setUserResults([]);
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
      if (editorMode === "rich") composerRef.current?.insertImage(url);
      else insertAtCaret(`![](${url})`);
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

  async function handleListButton() {
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
  }

  return (
    <div className="relative">
      {/* Reddit-style unified editor box */}
      <div className="rounded-2xl border border-slate-200/80 bg-white transition focus-within:border-blue-300 focus-within:ring-4 focus-within:ring-blue-100 dark:border-[#3a3028] dark:bg-[linear-gradient(145deg,_rgba(22,18,15,0.98),_rgba(18,15,12,0.98))] dark:focus-within:border-[#5a4a3f] dark:focus-within:ring-[#2c241d]">
        {editorMode === "rich" ? (
          <RichTextComposer
            key={composerKey}
            ref={composerRef}
            initialMarkdown={value}
            onChangeMarkdown={setValue}
            compact={compact}
            showToolbar={showToolbar}
            placeholder={
              mode === "edit"
                ? "Edit your content..."
                : "Join the conversation"
            }
            onSwitchToMarkdown={() => switchMode("markdown")}
          />
        ) : (
          <>
            <div className="flex items-center justify-between px-3 py-1.5">
              <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
                Markdown Editor
              </span>
              <button
                type="button"
                onClick={() => switchMode("rich")}
                className="text-xs font-semibold text-slate-600 hover:underline dark:text-slate-300"
              >
                Switch to Rich Text Editor
              </button>
            </div>
            <textarea
              ref={taRef}
              value={value}
              onChange={onChange}
              onKeyDown={onKeyDown}
              placeholder={
                mode === "edit"
                  ? "Edit your content..."
                  : "Join the conversation"
              }
              className={textareaClassName}
            />
          </>
        )}

        {/* footer inside the box: media tools left, actions right */}
        <div className="relative flex flex-wrap items-center justify-between gap-2 px-3 pb-2.5 pt-1">
          <div className="flex items-center gap-1">
            <button
              type="button"
              className={toolbarButtonClass}
              onClick={() => fileRef.current?.click()}
              title="Add image or GIF"
              aria-label="Add image or GIF"
            >
              <ImagePlus size={16} />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={handlePickFile}
            />
            <button
              type="button"
              className={toolbarButtonClass}
              title="Insert a link to one of your reading lists"
              aria-label="Insert a link to one of your reading lists"
              onClick={handleListButton}
            >
              <ListPlus size={16} />
            </button>
            {editorMode === "rich" && (
              <button
                type="button"
                onClick={() => setShowToolbar((s) => !s)}
                aria-expanded={showToolbar}
                title={
                  showToolbar ? "Hide formatting tools" : "Show formatting tools"
                }
                aria-label={
                  showToolbar ? "Hide formatting tools" : "Show formatting tools"
                }
                className={
                  showToolbar
                    ? "rounded-full bg-slate-200 px-2 py-1 text-xs font-semibold text-slate-900 dark:bg-[#2c241d] dark:text-slate-50"
                    : "rounded-full px-2 py-1 text-xs font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-[#241d19] dark:hover:text-slate-100"
                }
              >
                Aa
              </button>
            )}
            {uploading && (
              <span className="text-xs text-gray-500 dark:text-slate-400">
                Uploading...
              </span>
            )}
            {draftSaved && (
              <span className="text-[11px] italic text-slate-400 dark:text-slate-500">
                Draft saved
              </span>
            )}
            <span
              className={`ml-1 text-xs ${
                value.length > MAX_POST_LENGTH
                  ? "font-medium text-red-500"
                  : "text-slate-400 dark:text-slate-500"
              }`}
            >
              {value.length.toLocaleString()} /{" "}
              {MAX_POST_LENGTH.toLocaleString()}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {(mode === "edit" || onCancel) && (
              <button
                type="button"
                onClick={onCancel}
                className={secondaryButtonClassName}
              >
                Cancel
              </button>
            )}
            <button
              onClick={handlePrimary}
              disabled={value.length > MAX_POST_LENGTH}
              className={primaryButtonClassName}
            >
              {mode === "edit" ? "Save" : "Reply"}
            </button>
          </div>
        {listMenuOpen && (
          <div
            ref={listMenuRef}
            onMouseDown={(e) => e.stopPropagation()}
            className="absolute bottom-full left-2 z-50 mb-1 w-80 rounded border border-slate-200 bg-white shadow dark:border-[#3a3028] dark:bg-[linear-gradient(145deg,_rgba(27,22,19,0.98),_rgba(21,17,14,0.98))]"
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
                        if (editorMode === "rich")
                          composerRef.current?.insertLink(
                            l.name,
                            `/lists/${l.share_token}`
                          );
                        else
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

        </div>
      </div>

      {menuOpen && (results.length > 0 || userResults.length > 0) && (
        <div
          ref={menuRef}
          className="absolute left-2 right-2 top-full z-40 mt-1 max-h-60 overflow-auto rounded border border-slate-200 bg-white shadow dark:border-[#3a3028] dark:bg-[linear-gradient(145deg,_rgba(27,22,19,0.98),_rgba(21,17,14,0.98))]"
        >
          {/* Series results */}
          {results.length > 0 && (
            <>
              <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Series
              </div>
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
            </>
          )}

          {/* User results */}
          {userResults.length > 0 && (
            <>
              <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Users
              </div>
              {userResults.map((u, i) => {
                const idx = results.length + i;
                return (
                  <button
                    key={u.username}
                    type="button"
                    onClick={() => {
                      const caret = taRef.current?.selectionStart ?? value.length;
                      const hit = detectAtToken(value, caret);
                      const start = hit ? hit.tokenStart : mentionStart ?? caret;
                      const end = hit ? hit.tokenEnd : caret;
                      insertUserMention(u, start, end);
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-left ${
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
                    <span className="truncate text-sm font-medium">@{u.username}</span>
                  </button>
                );
              })}
            </>
          )}
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
