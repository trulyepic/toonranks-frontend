import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useUser } from "../login/useUser";
import {
  fetchForumReports,
  reviewForumReport,
  deleteForumReport,
  type ForumReportOut,
  type ForumReportStatus,
  type ForumReportsPage,
} from "../api/manApi";

function shortDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const STATUS_LABELS: Record<ForumReportStatus, string> = {
  OPEN: "Open",
  REVIEWED: "Reviewed",
  DISMISSED: "Dismissed",
};

const STATUS_COLORS: Record<ForumReportStatus, string> = {
  OPEN: "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
  REVIEWED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  DISMISSED: "bg-slate-100 text-slate-600 dark:bg-[#241d19] dark:text-slate-400",
};

export default function AdminReportsPage() {
  const { user } = useUser();
  const navigate = useNavigate();
  const isAdmin = (user?.role || "").toUpperCase() === "ADMIN";

  const [filter, setFilter] = useState<ForumReportStatus | "ALL">("OPEN");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ForumReportsPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState<number | null>(null);

  useEffect(() => {
    if (!isAdmin) {
      navigate("/");
      return;
    }
    setLoading(true);
    setError(null);
    fetchForumReports(page, filter === "ALL" ? undefined : filter)
      .then(setData)
      .catch(() => setError("Could not load reports."))
      .finally(() => setLoading(false));
  }, [filter, page, isAdmin, navigate]);

  const handleDelete = async (report: ForumReportOut) => {
    setActionBusy(report.id);
    try {
      await deleteForumReport(report.id);
      setData((prev) =>
        prev
          ? { ...prev, items: prev.items.filter((r) => r.id !== report.id), total: prev.total - 1 }
          : prev
      );
    } catch {
      // silent
    } finally {
      setActionBusy(null);
    }
  };

  const handleAction = async (report: ForumReportOut, action: "REVIEWED" | "DISMISSED") => {
    setActionBusy(report.id);
    try {
      await reviewForumReport(report.id, action);
      // Update in-place
      setData((prev) =>
        prev
          ? {
              ...prev,
              items: prev.items.map((r) =>
                r.id === report.id ? { ...r, status: action } : r
              ),
            }
          : prev
      );
    } catch {
      // silent — row keeps its current state
    } finally {
      setActionBusy(null);
    }
  };

  if (!isAdmin) return null;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">

      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-950 dark:text-white">Report Queue</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Review and action community-reported posts.
          </p>
        </div>
        <Link
          to="/forum"
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50 dark:border-[#3a3028] dark:bg-transparent dark:text-stone-200 dark:hover:bg-[#241d19]"
        >
          ← Back to forum
        </Link>
      </div>

      {/* Status filter tabs */}
      <div className="mb-6 flex flex-wrap gap-2">
        {(["OPEN", "REVIEWED", "DISMISSED", "ALL"] as const).map((s) => (
          <button
            key={s}
            onClick={() => { setFilter(s); setPage(1); }}
            className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition ${
              filter === s
                ? "border-slate-900 bg-slate-900 text-white dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-[#3a3028] dark:bg-transparent dark:text-stone-300 dark:hover:bg-[#241d19]"
            }`}
          >
            {s === "ALL" ? "All" : STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-16 text-center text-slate-400 dark:text-slate-500">Loading…</div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700 dark:border-rose-800/40 dark:bg-rose-950/20 dark:text-rose-300">
          {error}
        </div>
      ) : !data || data.items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 py-16 text-center text-sm text-slate-400 dark:border-[#3a3028] dark:text-slate-500">
          No {filter === "ALL" ? "" : STATUS_LABELS[filter as ForumReportStatus].toLowerCase() + " "}reports.
        </div>
      ) : (
        <div className="space-y-4">
          {data.items.map((r) => (
            <div
              key={r.id}
              className="overflow-hidden rounded-[1.5rem] border border-slate-200/80 bg-white shadow-sm dark:border-[#3a3028] dark:bg-[linear-gradient(145deg,rgba(27,22,19,0.98),rgba(21,17,14,0.98))]"
            >
              {/* Report header */}
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-[#3a3028]">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${STATUS_COLORS[r.status as ForumReportStatus]}`}>
                      {STATUS_LABELS[r.status as ForumReportStatus]}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Reported {shortDate(r.created_at)}
                      {r.reporter_username && (
                        <> by <span className="font-medium text-slate-700 dark:text-slate-200">{r.reporter_username}</span></>
                      )}
                    </span>
                  </div>
                  {r.thread_title && (
                    <Link
                      to={`/forum/${r.thread_id}#post-${r.post_id}`}
                      className="text-sm font-semibold text-blue-600 hover:underline dark:text-blue-400"
                    >
                      Thread: {r.thread_title} →
                    </Link>
                  )}
                </div>

                {/* Actions */}
                <div className="flex shrink-0 flex-wrap gap-2">
                  {r.status === "OPEN" && (
                    <>
                      <button
                        onClick={() => handleAction(r, "REVIEWED")}
                        disabled={actionBusy === r.id}
                        className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50 hover:bg-emerald-700"
                      >
                        {actionBusy === r.id ? "…" : "✓ Reviewed"}
                      </button>
                      <button
                        onClick={() => handleAction(r, "DISMISSED")}
                        disabled={actionBusy === r.id}
                        className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 disabled:opacity-50 hover:bg-slate-50 dark:border-[#3a3028] dark:text-stone-300 dark:hover:bg-[#241d19]"
                      >
                        Dismiss
                      </button>
                    </>
                  )}
                  {r.status !== "OPEN" && r.reviewed_at && (
                    <p className="text-xs text-slate-400 dark:text-slate-500 self-center">
                      {STATUS_LABELS[r.status as ForumReportStatus]} by{" "}
                      <span className="font-medium">{r.reviewed_by_username ?? "admin"}</span>{" "}
                      on {shortDate(r.reviewed_at)}
                    </p>
                  )}
                  <button
                    onClick={() => handleDelete(r)}
                    disabled={actionBusy === r.id}
                    className="rounded-full border border-rose-200 px-3 py-1.5 text-xs font-semibold text-rose-600 disabled:opacity-50 hover:bg-rose-50 dark:border-rose-800/60 dark:text-rose-400 dark:hover:bg-rose-950/20"
                  >
                    {actionBusy === r.id ? "…" : "Delete"}
                  </button>
                </div>
              </div>

              {/* Post excerpt */}
              <div className="px-5 py-4 space-y-2">
                {r.reason && (
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Reason</span>
                    <p className="mt-0.5 text-sm text-slate-700 dark:text-stone-200">{r.reason}</p>
                  </div>
                )}
                {r.post_excerpt && (
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Post excerpt</span>
                    <p className="mt-0.5 rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2 text-sm italic text-slate-600 dark:border-[#342b24] dark:bg-[#181310] dark:text-stone-300">
                      {r.post_excerpt}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Pagination */}
          {data.total_pages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setPage((p) => p - 1)}
                disabled={!data.has_prev}
                className="rounded-full border border-slate-200 px-4 py-1.5 text-sm font-medium text-slate-600 disabled:opacity-40 hover:bg-slate-50 dark:border-[#3a3028] dark:text-stone-300"
              >
                Prev
              </button>
              <span className="text-sm text-slate-500 dark:text-slate-400">
                {page} / {data.total_pages}
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={!data.has_next}
                className="rounded-full border border-slate-200 px-4 py-1.5 text-sm font-medium text-slate-600 disabled:opacity-40 hover:bg-slate-50 dark:border-[#3a3028] dark:text-stone-300"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
