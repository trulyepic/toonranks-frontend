import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { Link } from "react-router-dom";
import {
  approveSeries,
  deleteSeries,
  discoverExternalCatalog,
  getAdminUsers,
  getPendingSeries,
  importExternalBatch,
  importExternalTitle,
  searchExternalCatalog,
  updateUserRole,
  type AdminUser,
  type ExternalBatchImportRequest,
  type ExternalCatalogSort,
  type ExternalTitleCandidate,
  type PendingSeries,
  type SeriesType,
  type UserRole,
} from "../api/manApi";
import { ConfirmModal } from "../components/ConfirmModal";
import { useUser } from "../login/useUser";
import { isAdminUser } from "../util/roleUtils";
import { NoIndexSeo } from "../components/Seo";
import { SITE_NAME } from "../config/site";
import UserAvatar from "../components/UserAvatar";
import { inlineUsernameClassName } from "../util/userDisplay";

const roleOptions: UserRole[] = ["GENERAL", "CONTRIBUTOR", "ADMIN"];
const catalogSortOptions: { value: ExternalCatalogSort; label: string }[] = [
  { value: "POPULARITY_DESC", label: "Popularity" },
  { value: "TRENDING_DESC", label: "Trending" },
  { value: "SCORE_DESC", label: "Score" },
  { value: "START_DATE_DESC", label: "Newest" },
];

const roleDisplay: Record<
  UserRole,
  {
    badge: string;
    select: string;
  }
> = {
  GENERAL: {
    badge:
      "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-[#18120f] dark:text-stone-300 dark:ring-[#3a3028]",
    select:
      "border-slate-200 bg-white text-slate-900 dark:border-[#3a3028] dark:bg-[#18120f] dark:text-stone-100",
  },
  CONTRIBUTOR: {
    badge:
      "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-200 dark:ring-emerald-800/70",
    select:
      "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800/70 dark:bg-emerald-950/30 dark:text-emerald-200",
  },
  ADMIN: {
    badge:
      "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/30 dark:text-amber-200 dark:ring-amber-800/70",
    select:
      "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800/70 dark:bg-amber-950/30 dark:text-amber-200",
  },
};

export default function PendingTitlesPage() {
  const { user } = useUser();
  const isAdmin = isAdminUser(user);

  const [pendingTitles, setPendingTitles] = useState<PendingSeries[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [updatingUserId, setUpdatingUserId] = useState<number | null>(null);
  const [accessOpen, setAccessOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<PendingSeries | null>(null);
  const [catalogQuery, setCatalogQuery] = useState("");
  const [catalogType, setCatalogType] = useState<SeriesType | "">("");
  const [catalogResults, setCatalogResults] = useState<ExternalTitleCandidate[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogMessage, setCatalogMessage] = useState<string | null>(null);
  const [importingKey, setImportingKey] = useState<string | null>(null);
  const [batchType, setBatchType] = useState<SeriesType>("MANHWA");
  const [batchSort, setBatchSort] = useState<ExternalCatalogSort>("POPULARITY_DESC");
  const [batchPage, setBatchPage] = useState(1);
  const [batchPageSize, setBatchPageSize] = useState(25);
  const [batchGenre, setBatchGenre] = useState("");
  const [batchPreview, setBatchPreview] = useState<ExternalTitleCandidate[]>([]);
  const [batchPreviewRequest, setBatchPreviewRequest] =
    useState<ExternalBatchImportRequest | null>(null);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchImporting, setBatchImporting] = useState(false);
  const [batchMessage, setBatchMessage] = useState<string | null>(null);

  const contributorCount = useMemo(
    () =>
      users.filter((item) => String(item.role).toUpperCase() === "CONTRIBUTOR")
        .length,
    [users]
  );

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [pending, adminUsers] = await Promise.all([
        getPendingSeries(),
        getAdminUsers(),
      ]);
      setPendingTitles(pending);
      setUsers(adminUsers);
    } catch (err) {
      const message =
        (err as Error).message || "Failed to load admin review data.";
      if (message.includes("404") || message.includes("405")) {
        setError(
          "The current backend deployment does not have the review endpoints yet. Deploy the backend branch to use pending-title approval and contributor access management."
        );
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin]);

  const handleApprove = async (seriesId: number) => {
    setApprovingId(seriesId);
    setError(null);
    try {
      await approveSeries(seriesId);
      setPendingTitles((prev) => prev.filter((item) => item.id !== seriesId));
    } catch (err) {
      setError((err as Error).message || "Failed to approve title.");
    } finally {
      setApprovingId(null);
    }
  };

  const handleRoleChange = async (userId: number, role: UserRole) => {
    setUpdatingUserId(userId);
    setError(null);
    try {
      const updated = await updateUserRole(userId, role);
      setUsers((prev) =>
        prev.map((item) => (item.id === userId ? updated : item))
      );
    } catch (err) {
      setError((err as Error).message || "Failed to update role.");
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeletingId(confirmDelete.id);
    setError(null);
    try {
      await deleteSeries(confirmDelete.id);
      setPendingTitles((prev) => prev.filter((item) => item.id !== confirmDelete.id));
      setConfirmDelete(null);
    } catch (err) {
      setError((err as Error).message || "Failed to delete title.");
    } finally {
      setDeletingId(null);
    }
  };

  const mergePendingTitle = (series: PendingSeries) => {
    setPendingTitles((prev) => {
      if (prev.some((item) => item.id === series.id)) return prev;
      return [series, ...prev];
    });
  };

  const handleCatalogSearch = async (event: FormEvent) => {
    event.preventDefault();
    const query = catalogQuery.trim();
    if (query.length < 2) {
      setCatalogMessage("Search for at least 2 characters.");
      return;
    }

    setCatalogLoading(true);
    setCatalogMessage(null);
    try {
      const results = await searchExternalCatalog(query, {
        type: catalogType || undefined,
      });
      setCatalogResults(results);
      if (results.length === 0) {
        setCatalogMessage("No matching manga, manhwa, or manhua found.");
      }
    } catch (err) {
      setCatalogMessage((err as Error).message || "Catalog search failed.");
    } finally {
      setCatalogLoading(false);
    }
  };

  const handleImportCandidate = async (candidate: ExternalTitleCandidate) => {
    const key = `${candidate.source}:${candidate.external_id}`;
    setImportingKey(key);
    setCatalogMessage(null);
    try {
      const result = await importExternalTitle(candidate);
      if (result.imported) {
        mergePendingTitle(result.series);
      }
      setCatalogMessage(
        result.duplicate
          ? `"${result.series.title}" is already in ToonRanks, so no duplicate was created.`
          : `"${result.series.title}" was imported for review.`
      );
    } catch (err) {
      setCatalogMessage((err as Error).message || "Failed to import title.");
    } finally {
      setImportingKey(null);
    }
  };

  const batchRequest = {
    type: batchType,
    sort: batchSort,
    page: batchPage,
    page_size: batchPageSize,
    genre: batchGenre.trim() || undefined,
  };

  const handleBatchPreview = async (event: FormEvent) => {
    event.preventDefault();
    setBatchLoading(true);
    setBatchMessage(null);
    try {
      const results = await discoverExternalCatalog(batchRequest);
      setBatchPreview(results);
      setBatchPreviewRequest(batchRequest);
      if (results.length === 0) {
        setBatchMessage("No catalog candidates found for this batch.");
      }
    } catch (err) {
      setBatchMessage((err as Error).message || "Batch discovery failed.");
    } finally {
      setBatchLoading(false);
    }
  };

  const handleBatchImport = async () => {
    setBatchImporting(true);
    setBatchMessage(null);
    try {
      const result = await importExternalBatch(batchPreviewRequest ?? batchRequest);
      result.items.forEach((item) => {
        if (item.imported) mergePendingTitle(item.series);
      });
      setBatchMessage(
        `Imported ${result.imported}, skipped ${result.duplicates} duplicates${
          result.skipped ? `, skipped ${result.skipped} invalid` : ""
        }.`
      );
    } catch (err) {
      setBatchMessage((err as Error).message || "Batch import failed.");
    } finally {
      setBatchImporting(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <NoIndexSeo title={`Pending Titles | ${SITE_NAME}`} />
        <div className="dark-theme-shell rounded-[28px] border border-slate-200 p-8 text-center shadow-[0_24px_60px_-42px_rgba(15,23,42,0.45)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            Admin access
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">
            This page is for admins only
          </h1>
          <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
            Title review and account access controls are restricted to admins.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 lg:px-10">
      <NoIndexSeo title={`Pending Titles | ${SITE_NAME}`} />
      <section className="dark-theme-shell overflow-hidden rounded-[30px] border border-slate-200 shadow-[0_28px_70px_-46px_rgba(15,23,42,0.55)]">
        <div className="border-b border-slate-200/80 px-5 py-5 dark:border-[#342a23] sm:px-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            Admin review
          </p>
          <div className="mt-2 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">
                Pending title approvals
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300">
                Review newly submitted titles before they go live on the site,
                and manage who can submit future titles.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 ring-1 ring-inset ring-blue-100 dark:bg-[linear-gradient(145deg,_rgba(34,47,83,0.82),_rgba(24,31,55,0.82))] dark:text-blue-200 dark:ring-[#475276]">
                {pendingTitles.length} pending
              </span>
              <span className="inline-flex items-center rounded-full bg-white px-3 py-1.5 text-sm font-medium text-slate-600 ring-1 ring-inset ring-slate-200 dark-theme-chip dark:text-slate-300">
                {contributorCount} contributors
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-8 px-5 py-6 sm:px-6">
          {error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/80 dark:bg-rose-950/40 dark:text-rose-200">
              {error}
            </div>
          )}

          <section>
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-slate-950 dark:text-white">
                Import from catalog
              </h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Bring AniList candidates into the private review queue. They stay hidden until approval.
              </p>
            </div>

            <form
              onSubmit={handleBatchPreview}
              className="grid gap-3 rounded-[24px] border border-slate-200 bg-white/80 p-4 dark-theme-card-soft lg:grid-cols-[150px_170px_130px_150px_1fr_auto]"
            >
              <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                Type
                <select
                  value={batchType}
                  onChange={(event) => setBatchType(event.target.value as SeriesType)}
                  className="dark-theme-field mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-slate-900 dark:border-[#3a3028] dark:text-stone-100"
                >
                  <option value="MANGA">Manga</option>
                  <option value="MANHWA">Manhwa</option>
                  <option value="MANHUA">Manhua</option>
                </select>
              </label>
              <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                Sort by
                <select
                  value={batchSort}
                  onChange={(event) => setBatchSort(event.target.value as ExternalCatalogSort)}
                  className="dark-theme-field mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-slate-900 dark:border-[#3a3028] dark:text-stone-100"
                >
                  {catalogSortOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                Page number
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={batchPage}
                  onChange={(event) => setBatchPage(Math.max(1, Number(event.target.value) || 1))}
                  className="dark-theme-field mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-slate-900 dark:border-[#3a3028] dark:text-stone-100"
                />
              </label>
              <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                Titles per page
                <select
                  value={batchPageSize}
                  onChange={(event) => setBatchPageSize(Number(event.target.value))}
                  className="dark-theme-field mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-slate-900 dark:border-[#3a3028] dark:text-stone-100"
                >
                  <option value={10}>10 titles</option>
                  <option value={25}>25 titles</option>
                  <option value={50}>50 titles</option>
                </select>
              </label>
              <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                Genre
                <input
                  value={batchGenre}
                  onChange={(event) => setBatchGenre(event.target.value)}
                  placeholder="Optional"
                  className="dark-theme-field mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-slate-900 placeholder:text-slate-400 dark:border-[#3a3028] dark:text-stone-100"
                />
              </label>
              <button
                type="submit"
                disabled={batchLoading}
                className="self-end rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
              >
                {batchLoading ? "Loading..." : "Preview batch"}
              </button>
            </form>

            {batchMessage ? (
              <div className="mt-3 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-[#475276] dark:bg-[linear-gradient(145deg,_rgba(34,47,83,0.82),_rgba(24,31,55,0.82))] dark:text-blue-200">
                {batchMessage}
              </div>
            ) : null}

            {batchPreview.length > 0 ? (
              <div className="mt-4 overflow-hidden rounded-[24px] border border-slate-200 dark:border-[#3a3028]">
                <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-[#3a3028] dark:bg-[#18120f] sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                      Batch preview
                    </h3>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {batchPreview.length} candidates from {batchType}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleBatchImport}
                    disabled={batchImporting}
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {batchImporting ? "Importing..." : "Import preview"}
                  </button>
                </div>
                <div className="divide-y divide-slate-200 dark:divide-[#3a3028]">
                  {batchPreview.map((candidate) => (
                    <div
                      key={`${candidate.source}:${candidate.external_id}`}
                      className="flex gap-3 px-4 py-3"
                    >
                      <div className="h-24 w-16 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 dark:border-[#3a3028] dark:bg-[#241d19]">
                        {candidate.cover_url ? (
                          <img
                            src={candidate.cover_url}
                            alt={candidate.title}
                            className="h-full w-full object-cover"
                          />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="truncate text-sm font-semibold text-slate-950 dark:text-white">
                            {candidate.title}
                          </h4>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600 dark-theme-chip dark:text-slate-300">
                            {candidate.type}
                          </span>
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600 dark:text-slate-300">
                          {candidate.genre || "No genres provided"}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
                          {candidate.popularity ? <span>{candidate.popularity} popularity</span> : null}
                          {candidate.average_score ? <span>{candidate.average_score}% score</span> : null}
                          <a
                            href={candidate.external_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 hover:underline dark:text-blue-300"
                          >
                            Source
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="mt-6 border-t border-slate-200 pt-5 dark:border-[#3a3028]">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Find a specific title
              </h3>
            </div>

            <form
              onSubmit={handleCatalogSearch}
              className="mt-3 grid gap-3 rounded-[24px] border border-slate-200 bg-white/80 p-4 dark-theme-card-soft sm:grid-cols-[1fr_180px_auto]"
            >
              <input
                value={catalogQuery}
                onChange={(event) => setCatalogQuery(event.target.value)}
                placeholder="Search title"
                className="dark-theme-field rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 dark:border-[#3a3028] dark:text-stone-100"
              />
              <select
                value={catalogType}
                onChange={(event) => setCatalogType(event.target.value as SeriesType | "")}
                className="dark-theme-field rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 dark:border-[#3a3028] dark:text-stone-100"
              >
                <option value="">All types</option>
                <option value="MANGA">Manga</option>
                <option value="MANHWA">Manhwa</option>
                <option value="MANHUA">Manhua</option>
              </select>
              <button
                type="submit"
                disabled={catalogLoading}
                className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
              >
                {catalogLoading ? "Searching..." : "Search"}
              </button>
            </form>

            {catalogMessage ? (
              <div className="mt-3 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-[#475276] dark:bg-[linear-gradient(145deg,_rgba(34,47,83,0.82),_rgba(24,31,55,0.82))] dark:text-blue-200">
                {catalogMessage}
              </div>
            ) : null}

            {catalogResults.length > 0 ? (
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {catalogResults.map((candidate) => {
                  const key = `${candidate.source}:${candidate.external_id}`;
                  return (
                    <article
                      key={key}
                      className="dark-theme-card flex gap-4 rounded-[24px] border border-slate-200 p-3"
                    >
                      <div className="h-36 w-24 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 dark:border-[#3a3028] dark:bg-[#241d19]">
                        {candidate.cover_url ? (
                          <img
                            src={candidate.cover_url}
                            alt={candidate.title}
                            className="h-full w-full object-cover"
                          />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600 dark-theme-chip dark:text-slate-300">
                            {candidate.type}
                          </span>
                          <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 ring-1 ring-slate-200 dark-theme-chip dark:text-slate-300">
                            {candidate.source}
                          </span>
                        </div>
                        <h3 className="mt-2 line-clamp-2 text-base font-semibold text-slate-950 dark:text-white">
                          {candidate.title}
                        </h3>
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600 dark:text-slate-300">
                          {candidate.genre || "No genres provided"}
                        </p>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleImportCandidate(candidate)}
                            disabled={importingKey === key}
                            className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                          >
                            {importingKey === key ? "Importing..." : "Import for review"}
                          </button>
                          <a
                            href={candidate.external_url}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50 dark:border-[#3a3028] dark:text-slate-200 dark:hover:bg-[#241d19]"
                          >
                            Source
                          </a>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : null}
          </section>

          <section>
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-slate-950 dark:text-white">
                Submitted titles
              </h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Approved titles will become visible in rankings, search,
                compare, and detail pages.
              </p>
            </div>

            {loading ? (
              <div className="py-10 text-sm text-slate-500 dark:text-slate-400">
                Loading pending titles...
              </div>
            ) : pendingTitles.length === 0 ? (
              <div className="dark-theme-card rounded-[24px] border border-slate-200 px-5 py-6 text-sm text-slate-600 dark:text-slate-300">
                No titles are waiting for approval right now.
              </div>
            ) : (
              <div className="space-y-4">
                {pendingTitles.map((item) => (
                  <article
                    key={item.id}
                    className="dark-theme-card overflow-hidden rounded-[28px] border border-slate-200 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.45)]"
                  >
                    <div className="flex flex-col gap-5 p-4 sm:p-5 lg:flex-row lg:items-start lg:gap-7">
                      <Link
                        to={`/series/${item.id}`}
                        state={{
                          title: item.title,
                          genre: item.genre,
                          type: item.type,
                        }}
                        className="mx-auto flex h-72 w-52 shrink-0 items-center justify-center overflow-hidden rounded-[26px] border border-slate-200 bg-slate-100 shadow-sm transition hover:scale-[1.01] dark:border-[#3a3028] dark:bg-[#241d19] sm:h-80 sm:w-56 lg:mx-0"
                      >
                        <img
                          src={item.cover_url}
                          alt={item.title}
                          className="h-full w-full object-contain"
                        />
                      </Link>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600 ring-1 ring-inset ring-slate-200 dark-theme-chip dark:text-slate-300">
                            {item.type}
                          </span>
                          {item.status ? (
                            <span className="inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-200 dark-theme-chip dark:text-slate-300">
                              {String(item.status).replace("_", " ")}
                            </span>
                          ) : null}
                        </div>

                        <h3 className="mt-3 text-2xl font-semibold leading-tight text-slate-950 dark:text-white">
                          {item.title}
                        </h3>
                        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600 dark:text-slate-300">
                          {item.genre}
                        </p>

                        <div className="mt-5 grid gap-x-6 gap-y-3 text-sm text-slate-600 dark:text-slate-300 sm:grid-cols-2">
                          <div>
                            <span className="font-medium text-slate-800 dark:text-slate-100">
                              Author:
                            </span>{" "}
                            {item.author || "Not provided"}
                          </div>
                          <div>
                            <span className="font-medium text-slate-800 dark:text-slate-100">
                              Artist:
                            </span>{" "}
                            {item.artist || "Not provided"}
                          </div>
                          <div className="sm:col-span-2">
                            <span className="font-medium text-slate-800 dark:text-slate-100">
                              Submitted by:
                            </span>{" "}
                            {item.submitted_by_username ||
                              `User #${item.submitted_by_id ?? "?"}`}
                          </div>
                          {item.external_source && item.external_url ? (
                            <div className="sm:col-span-2">
                              <span className="font-medium text-slate-800 dark:text-slate-100">
                                Source:
                              </span>{" "}
                              <a
                                href={item.external_url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-600 hover:underline dark:text-blue-300"
                              >
                                {item.external_source} #{item.external_id}
                              </a>
                            </div>
                          ) : null}
                          <div className="sm:col-span-2">
                            <span className="font-medium text-slate-800 dark:text-slate-100">
                              Review readiness:
                            </span>{" "}
                            {item.detail_ready
                              ? "Details complete"
                              : "Waiting for title details and detail cover"}
                          </div>
                        </div>

                        <div className="mt-6 flex flex-wrap gap-3">
                          <button
                            onClick={() => handleApprove(item.id)}
                            disabled={
                              approvingId === item.id ||
                              deletingId === item.id ||
                              !item.detail_ready
                            }
                            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                          >
                            {approvingId === item.id
                              ? "Approving..."
                              : item.detail_ready
                                ? "Approve title"
                                : "Waiting on details"}
                          </button>
                          <Link
                            to={`/series/${item.id}`}
                            state={{
                              title: item.title,
                              genre: item.genre,
                              type: item.type,
                            }}
                            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-[#3a3028] dark:text-slate-200 dark:hover:bg-[#241d19]"
                          >
                            Preview details
                          </Link>
                          <button
                            type="button"
                            onClick={() => setConfirmDelete(item)}
                            disabled={approvingId === item.id || deletingId === item.id}
                            className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100 disabled:opacity-60 dark:border-rose-900/80 dark:bg-rose-950/30 dark:text-rose-200 dark:hover:bg-rose-950/45"
                          >
                            {deletingId === item.id ? "Deleting..." : "Delete title"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section>
            <div className="overflow-hidden rounded-[24px] border border-slate-200 dark:border-[#3a3028]">
              <button
                type="button"
                onClick={() => setAccessOpen((prev) => !prev)}
                className="flex w-full items-start justify-between gap-4 px-4 py-4 text-left transition hover:bg-slate-50/70 dark:hover:bg-[#18120f]"
              >
                <div>
                  <h2 className="text-xl font-semibold text-slate-950 dark:text-white">
                    Title submission access
                  </h2>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    Set trusted users to{" "}
                    <span className="font-medium">Contributor</span> so they
                    can submit titles without getting edit or delete access.
                  </p>
                </div>
                <div className="mt-1 inline-flex items-center gap-3">
                  <span className="inline-flex items-center rounded-full bg-white px-3 py-1.5 text-sm font-medium text-slate-600 ring-1 ring-inset ring-slate-200 dark-theme-chip dark:text-slate-300">
                    {users.length} users
                  </span>
                  <ChevronDownIcon
                    className={`h-5 w-5 text-slate-500 transition-transform dark:text-slate-300 ${
                      accessOpen ? "rotate-180" : ""
                    }`}
                  />
                </div>
              </button>

              {accessOpen && (
                <div className="border-t border-slate-200 dark:border-[#3a3028]">
                  {loading ? (
                    <div className="px-4 py-10 text-sm text-slate-500 dark:text-slate-400">
                      Loading users...
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead className="bg-slate-50 text-slate-600 dark:bg-[#18120f] dark:text-stone-300">
                          <tr>
                            <th className="px-4 py-3 text-left">Username</th>
                            <th className="px-4 py-3 text-left">Email</th>
                            <th className="px-4 py-3 text-left">
                              Current role
                            </th>
                            <th className="px-4 py-3 text-left">Verified</th>
                            <th className="px-4 py-3 text-right">Access</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-[#3a3028]">
                          {users.map((account) => (
                            <tr key={account.id} className="dark-theme-card-soft">
                              <td className="px-4 py-3 font-medium text-slate-900 dark:text-stone-100">
                                <span className="inline-flex items-center gap-2">
                                  <UserAvatar
                                    username={account.username}
                                    avatarUrl={account.avatar_url}
                                    avatarPreset={account.avatar_preset}
                                    size="sm"
                                  />
                                  <span className={inlineUsernameClassName(account.role)}>
                                    {account.username}
                                  </span>
                                </span>
                              </td>
                              <td className="px-4 py-3 text-slate-600 dark:text-stone-300">
                                {account.email || "—"}
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ring-1 ring-inset ${
                                    roleDisplay[
                                      String(account.role).toUpperCase() as UserRole
                                    ]?.badge ?? roleDisplay.GENERAL.badge
                                  }`}
                                >
                                  {account.role}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-slate-600 dark:text-stone-300">
                                {account.is_verified ? "Yes" : "No"}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <select
                                  value={String(account.role).toUpperCase()}
                                  disabled={updatingUserId === account.id}
                                  onChange={(e) =>
                                    handleRoleChange(
                                      account.id,
                                      e.target.value as UserRole
                                    )
                                  }
                                  className={`dark-theme-field rounded-xl border px-3 py-2 text-sm font-medium ${
                                    roleDisplay[
                                      String(account.role).toUpperCase() as UserRole
                                    ]?.select ?? roleDisplay.GENERAL.select
                                  }`}
                                >
                                  {roleOptions.map((role) => (
                                    <option key={role} value={role}>
                                      {role}
                                    </option>
                                  ))}
                                </select>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>
      </section>

      <ConfirmModal
        open={!!confirmDelete}
        title="Delete pending title?"
        message={
          confirmDelete
            ? `This will permanently delete "${confirmDelete.title}", its detail record, votes, and both uploaded images.`
            : ""
        }
        confirmText={deletingId ? "Deleting..." : "Delete"}
        cancelText="Cancel"
        destructive
        onCancel={() => (deletingId ? null : setConfirmDelete(null))}
        onConfirm={handleDelete}
        busy={deletingId !== null}
      />
    </div>
  );
}
