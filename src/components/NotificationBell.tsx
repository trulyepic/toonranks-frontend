import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  fetchNotifications,
  fetchUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  type NotificationOut,
} from "../api/manApi";

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function kindLabel(kind: string): string {
  switch (kind) {
    case "THREAD_REPLY": return "replied to your thread";
    case "THREAD_FOLLOW_REPLY": return "posted in a thread you follow";
    case "POST_MENTION": return "mentioned you";
    default: return kind.toLowerCase().replace(/_/g, " ");
  }
}

export default function NotificationBell() {
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationOut[]>([]);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Poll unread count every 60 seconds + on window focus
  const refreshCount = () => {
    fetchUnreadCount()
      .then((r) => setUnreadCount(r.count))
      .catch(() => {});
  };

  useEffect(() => {
    refreshCount();
    const interval = setInterval(refreshCount, 60_000);
    const onFocus = () => refreshCount();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  // Load notifications when panel opens
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetchNotifications(1)
      .then((data) => {
        setNotifications(data.items);
        setUnreadCount(data.unread_count);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleClick = async (n: NotificationOut) => {
    if (!n.is_read) {
      await markNotificationRead(n.id).catch(() => {});
      setNotifications((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    setOpen(false);
    if (n.thread_id) {
      const hash = n.post_id ? `#post-${n.post_id}` : "";
      navigate(`/forum/${n.thread_id}${hash}`);
    }
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead().catch(() => {});
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  const cappedCount = unreadCount > 99 ? "99+" : unreadCount > 0 ? String(unreadCount) : null;

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-100 hover:text-slate-900 dark:border-[#3a3028] dark:bg-transparent dark:text-slate-300 dark:hover:bg-[#241d19] dark:hover:text-white"
      >
        <span className="text-lg leading-none">🔔</span>
        {cappedCount && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-none text-white">
            {cappedCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_18px_40px_-28px_rgba(15,23,42,0.55)] dark:border-[#3a3028] dark:bg-[linear-gradient(145deg,rgba(27,22,19,0.98),rgba(21,17,14,0.98))]">

          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-[#3a3028]">
            <span className="text-sm font-bold text-slate-900 dark:text-white">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[360px] overflow-y-auto">
            {loading ? (
              <div className="px-4 py-8 text-center text-sm text-slate-400 dark:text-slate-500">
                Loading…
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-slate-400 dark:text-slate-500">
                No notifications yet.
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => handleClick(n)}
                  className={`flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-slate-50 dark:hover:bg-[#241d19] ${
                    !n.is_read
                      ? "bg-blue-50/60 dark:bg-blue-950/20"
                      : ""
                  }`}
                >
                  {/* Unread dot */}
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.is_read ? "bg-transparent" : "bg-blue-500"}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs leading-relaxed text-slate-700 dark:text-stone-200">
                      {n.actor_username ? (
                        <span className="font-semibold">{n.actor_username}</span>
                      ) : null}
                      {" "}
                      {n.summary ?? kindLabel(n.kind)}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">
                      {relativeTime(n.created_at)}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-100 px-4 py-2.5 dark:border-[#3a3028]">
            <button
              onClick={() => { setOpen(false); navigate("/account"); }}
              className="text-xs font-medium text-slate-500 hover:text-slate-800 hover:underline dark:text-slate-400 dark:hover:text-slate-200"
            >
              View all in account →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
