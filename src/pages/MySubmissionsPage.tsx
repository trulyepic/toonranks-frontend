import { useEffect, useState } from "react";
import { Clock3, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import {
  getMySubmittedSeries,
  removeMyApprovedSubmissions,
  type PendingSeries,
  type Series,
} from "../api/manApi";
import { useUser } from "../login/useUser";
import { canSubmitSeriesUser, isAdminUser } from "../util/roleUtils";
import EditSeriesModal from "../components/EditSeriesModal";
import { NoIndexSeo } from "../components/Seo";
import { SITE_NAME } from "../config/site";
import { formatSubmissionAge } from "../util/submissionAge";
import { ConfirmModal } from "../components/ConfirmModal";

function statusLabel(status?: string | null) {
  if (!status) return "Pending review";
  return status.replace(/_/g, " ");
}

function isApprovedSubmission(item: PendingSeries) {
  return String(item.approval_status || "").toUpperCase() === "APPROVED";
}

export default function MySubmissionsPage() {
  const { user } = useUser();
  const canSubmit = canSubmitSeriesUser(user);
  const isAdmin = isAdminUser(user);
  const [items, setItems] = useState<PendingSeries[]>([]);
  const [editItem, setEditItem] = useState<PendingSeries | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedApprovedIds, setSelectedApprovedIds] = useState<Set<number>>(
    new Set()
  );
  const [removeIds, setRemoveIds] = useState<number[]>([]);
  const [removing, setRemoving] = useState(false);

  const approvedIds = items
    .filter(isApprovedSubmission)
    .map((item) => item.id);
  const allApprovedSelected =
    approvedIds.length > 0 &&
    approvedIds.every((id) => selectedApprovedIds.has(id));

  const toggleApprovedSelection = (seriesId: number) => {
    setSelectedApprovedIds((current) => {
      const next = new Set(current);
      if (next.has(seriesId)) next.delete(seriesId);
      else next.add(seriesId);
      return next;
    });
  };

  const toggleAllApproved = () => {
    setSelectedApprovedIds(
      allApprovedSelected ? new Set() : new Set(approvedIds)
    );
  };

  const handleRemoveApproved = async () => {
    if (removeIds.length === 0) return;

    setRemoving(true);
    setError(null);
    try {
      const removedIds = await removeMyApprovedSubmissions(removeIds);
      const removed = new Set(removedIds);
      setItems((current) => current.filter((item) => !removed.has(item.id)));
      setSelectedApprovedIds((current) => {
        const next = new Set(current);
        removedIds.forEach((id) => next.delete(id));
        return next;
      });
      setRemoveIds([]);
    } catch (err) {
      setError(
        (err as Error).message ||
          "Failed to remove approved titles from submission history."
      );
    } finally {
      setRemoving(false);
    }
  };

  const mergeUpdatedSubmission = (
    item: PendingSeries,
    updated: Series
  ): PendingSeries => ({
    ...item,
    title: updated.title,
    genre: updated.genre,
    type: updated.type,
    cover_url: updated.cover_url,
    vote_count: updated.vote_count,
    author: updated.author,
    artist: updated.artist,
    status: updated.status,
    approval_status: updated.approval_status,
  });

  useEffect(() => {
    if (!canSubmit) return;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const rows = await getMySubmittedSeries();
        setItems(rows);
      } catch (err) {
        const message =
          (err as Error).message || "Failed to load submitted titles.";
        if (message.includes("404") || message.includes("405")) {
          setError(
            "The current backend deployment does not have the submission-tracking endpoints yet. Deploy the backend branch to view and manage submitted titles here."
          );
        } else {
          setError(message);
        }
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [canSubmit]);

  if (!canSubmit) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <NoIndexSeo title={`My Submissions | ${SITE_NAME}`} />
        <div className="dark-theme-shell rounded-[28px] border border-slate-200 p-8 text-center shadow-[0_24px_60px_-42px_rgba(15,23,42,0.45)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            Submission access
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">
            This page is for contributors and admins
          </h1>
          <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
            Submitted titles are only visible to the people allowed to add them.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 lg:px-10">
      <NoIndexSeo title={`My Submissions | ${SITE_NAME}`} />
      <section className="dark-theme-shell overflow-hidden rounded-[30px] border border-slate-200 shadow-[0_28px_70px_-46px_rgba(15,23,42,0.55)]">
        <div className="border-b border-slate-200/80 px-5 py-5 dark:border-[#342a23] sm:px-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            Title submissions
          </p>
          <div className="mt-2 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">
                My submitted titles
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300">
                Finish newly submitted titles before review. Approved titles remain
                here for 30 days and continue to stay live after leaving this list.
              </p>
            </div>
            <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 ring-1 ring-inset ring-blue-100 dark:bg-[linear-gradient(145deg,_rgba(34,47,83,0.82),_rgba(24,31,55,0.82))] dark:text-blue-200 dark:ring-[#475276]">
              {items.length} submitted
            </span>
          </div>
        </div>

        <div className="space-y-6 px-5 py-6 sm:px-6">
          {error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/80 dark:bg-rose-950/40 dark:text-rose-200">
              {error}
            </div>
          )}

          {isAdmin && approvedIds.length > 0 && !loading && (
            <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-[#3a3028] dark:bg-[#1e1814]">
              <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={allApprovedSelected}
                  onChange={toggleAllApproved}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-[#4a3c33] dark:bg-[#17120f]"
                />
                Select all approved ({approvedIds.length})
              </label>
              <button
                type="button"
                onClick={() => setRemoveIds(Array.from(selectedApprovedIds))}
                disabled={selectedApprovedIds.size === 0}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-rose-900/80 dark:bg-[#211614] dark:text-rose-200 dark:hover:bg-rose-950/30"
              >
                <Trash2 aria-hidden="true" className="h-4 w-4" />
                Remove selected ({selectedApprovedIds.size})
              </button>
            </div>
          )}

          {loading ? (
            <div className="py-10 text-sm text-slate-500 dark:text-slate-400">
              Loading your submissions...
            </div>
          ) : items.length === 0 ? (
            <div className="dark-theme-card rounded-[24px] border border-slate-200 px-5 py-6 text-sm text-slate-600 dark:text-slate-300">
              You haven't submitted any titles yet.
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {items.map((item) => {
                const isApproved = isApprovedSubmission(item);
                const approvalAge = isApproved
                  ? formatSubmissionAge(item.approved_at)
                  : null;

                return (
                  <article
                    key={item.id}
                    className="dark-theme-card overflow-hidden rounded-[28px] border border-slate-200 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.45)]"
                  >
                    {isAdmin && isApproved && (
                      <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 px-4 py-3 dark:border-[#342a23] sm:px-5">
                        <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">
                          <input
                            type="checkbox"
                            checked={selectedApprovedIds.has(item.id)}
                            onChange={() => toggleApprovedSelection(item.id)}
                            aria-label={`Select ${item.title}`}
                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-[#4a3c33] dark:bg-[#17120f]"
                          />
                          Select
                        </label>
                        <button
                          type="button"
                          onClick={() => setRemoveIds([item.id])}
                          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950/30"
                        >
                          <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                          Remove
                        </button>
                      </div>
                    )}
                    <div className="flex gap-4 p-4 sm:p-5">
                      <Link
                        to={`/series/${item.id}`}
                        state={{
                          title: item.title,
                          genre: item.genre,
                          type: item.type,
                          author: item.author,
                          artist: item.artist,
                          approval_status: item.approval_status,
                          submitted_by_id: item.submitted_by_id,
                          can_manage_pending_details: !isApproved,
                        }}
                        className="block h-40 w-28 shrink-0 overflow-hidden rounded-[22px] border border-slate-200 bg-slate-100 shadow-sm dark:border-[#3a3028] dark:bg-[#241d19] sm:h-44 sm:w-32"
                      >
                        <img
                          src={item.cover_url}
                          alt={item.title}
                          className="h-full w-full object-cover"
                        />
                      </Link>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600 ring-1 ring-inset ring-slate-200 dark-theme-chip dark:text-slate-300">
                            {item.type}
                          </span>
                          <span className="inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-200 dark-theme-chip dark:text-slate-300">
                            {statusLabel(item.status)}
                          </span>
                          <span
                            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ${
                              isApproved
                                ? "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-900/80"
                                : "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-900/80"
                            }`}
                          >
                            {isApproved ? "Approved" : "Awaiting approval"}
                          </span>
                        </div>

                        <h3 className="mt-3 text-xl font-semibold leading-tight text-slate-950 dark:text-white">
                          {item.title}
                        </h3>
                        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                          {item.genre}
                        </p>

                        {approvalAge && (
                          <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                            <Clock3 aria-hidden="true" className="h-3.5 w-3.5" />
                            {approvalAge}
                          </p>
                        )}

                        <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">
                          {!isApproved
                            ? item.detail_ready
                              ? "Details are complete. This title is ready for admin review and approval."
                              : "Open the title page to add title details and the secondary cover image before admin review."
                            : "This title is approved and now visible across the site."}
                        </p>

                        {!isApproved && (
                          <div className="mt-3">
                            <span
                              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ring-1 ring-inset ${
                                item.detail_ready
                                  ? "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-900/80"
                                  : "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-900/80"
                              }`}
                            >
                              {item.detail_ready ? "Ready for review" : "Details still needed"}
                            </span>
                          </div>
                        )}

                        <div className="mt-4 flex flex-wrap gap-3">
                          {!isApproved && (
                            <button
                              onClick={() => setEditItem(item)}
                              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                            >
                              Edit submission
                            </button>
                          )}
                          <Link
                            to={`/series/${item.id}`}
                            state={{
                              title: item.title,
                              genre: item.genre,
                              type: item.type,
                              author: item.author,
                              artist: item.artist,
                              approval_status: item.approval_status,
                              submitted_by_id: item.submitted_by_id,
                              can_manage_pending_details: !isApproved,
                            }}
                            className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                              isApproved
                                ? "bg-blue-600 font-semibold text-white hover:bg-blue-700"
                                : "border border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-[#3a3028] dark:text-slate-200 dark:hover:bg-[#241d19]"
                            }`}
                          >
                            {isApproved ? "Open title" : "Preview submission"}
                          </Link>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {editItem && (
        <EditSeriesModal
          id={editItem.id}
          initialData={{
            title: editItem.title,
            genre: editItem.genre,
            type: editItem.type,
            author: editItem.author,
            artist: editItem.artist,
            cover_url: editItem.cover_url,
            status: editItem.status ?? null,
          }}
          onClose={() => setEditItem(null)}
          onSuccess={(updated) => {
            setItems((prev) =>
              prev.map((item) =>
                item.id === updated.id
                  ? mergeUpdatedSubmission(item, updated)
                  : item
              )
            );
          }}
        />
      )}

      <ConfirmModal
        open={removeIds.length > 0}
        title={
          removeIds.length === 1
            ? "Remove approved title?"
            : "Remove approved titles?"
        }
        message={
          removeIds.length === 1
            ? "This removes the approved title from My Submissions only. The published title will remain live everywhere else."
            : `This removes ${removeIds.length} approved titles from My Submissions only. The published titles will remain live everywhere else.`
        }
        confirmText={removeIds.length === 1 ? "Remove title" : "Remove titles"}
        destructive
        busy={removing}
        onConfirm={handleRemoveApproved}
        onCancel={() => setRemoveIds([])}
      />
    </div>
  );
}
