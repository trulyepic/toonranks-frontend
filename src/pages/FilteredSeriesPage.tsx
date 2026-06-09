import { useParams } from "react-router-dom";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet";
import {
  deleteSeries,
  fetchRankedSeriesPaginated,
  getMyReadingLists,
  searchSeries,
  type RankedSeries,
  type ReadingList,
  type Series,
  type SeriesStatus,
} from "../api/manApi";
import { isRequestCanceled } from "../api/client";
import CompareManager from "../components/CompareManager";
import EditSeriesModal from "../components/EditSeriesModal";
import RankingsToolbar, { type SortValue } from "../components/RankingsToolbar";
import InfiniteScroll from "react-infinite-scroll-component";
import ManCard from "../components/ManCard";
import ReadingListModal from "../components/ReadingListModal";
import ShimmerLoader from "../components/ShimmerLoader";
import { useSearch } from "../components/useSearch";
import { useUser } from "../login/useUser";
import { isAdminUser } from "../util/roleUtils";
import {
  absoluteUrl,
  DEFAULT_SOCIAL_IMAGE,
  SITE_NAME,
} from "../config/site";

const PAGE_SIZE = 25;

const FilteredSeriesPage = () => {
  const { seriesType } = useParams();
  const { searchTerm } = useSearch();

  const [items, setItems] = useState<RankedSeries[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [editItem, setEditItem] = useState<Series | null>(null);
  const [activeStatus, setActiveStatus] = useState<SeriesStatus>(null);
  const [activeGenre, setActiveGenre] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortValue>("score");
  const [allGenres, setAllGenres] = useState<string[]>([]);
  const controllerRef = useRef<AbortController | null>(null);

  const { user } = useUser();
  const isAdmin = isAdminUser(user);
  const typeLabel = (seriesType || "").toUpperCase();
  const pageTitle = `Top ${typeLabel} Rankings | ${SITE_NAME}`;
  const pageDescription = `Browse top-ranked ${typeLabel.toLowerCase()} series on ${SITE_NAME}. Discover popular titles, compare scores, and save your favorites.`;

  const [showListModal, setShowListModal] = useState(false);
  const [modalSeriesId, setModalSeriesId] = useState<number | undefined>();
  const [myLists, setMyLists] = useState<ReadingList[] | null>(null);

  const normalizeGenre = useCallback(
    (genre: string) =>
      genre
        .split(" ")
        .map((word) =>
          word ? word[0].toUpperCase() + word.slice(1).toLowerCase() : word
        )
        .join(" ")
        .replace(/\bSci-fi\b/gi, "Sci-Fi"),
    []
  );

  const derivedGenres = useMemo(() => {
    const set = new Set<string>();

    for (const item of items) {
      if (!item?.genre) continue;
      String(item.genre)
        .split(",")
        .map((entry) => normalizeGenre(entry.trim()))
        .filter(Boolean)
        .forEach((entry) => set.add(entry));
    }

    return Array.from(set);
  }, [items, normalizeGenre]);

  // Accumulate genres so the strip never collapses when a filter narrows results.
  useEffect(() => {
    setAllGenres((prev) => {
      const merged = new Set(prev);
      let changed = false;
      for (const g of derivedGenres) {
        if (!merged.has(g)) {
          merged.add(g);
          changed = true;
        }
      }
      return changed
        ? Array.from(merged).sort((a, b) => a.localeCompare(b))
        : prev;
    });
  }, [derivedGenres]);

  useEffect(() => {
    let ignore = false;
    const run = async () => {
      if (!user) {
        setMyLists(null);
        return;
      }

      try {
        const res = await getMyReadingLists();
        if (!ignore) setMyLists(res);
      } catch {
        if (!ignore) setMyLists([]);
      }
    };

    run();
    return () => {
      ignore = true;
    };
  }, [user]);

  const canCreateMoreLists = !!user && (myLists?.length ?? 0) < 2;

  const inAnyListIds = new Set(
    (myLists ?? []).flatMap((list) => list.items?.map((item) => item.series_id) ?? [])
  );

  const openCreateListOnly = () => {
    setModalSeriesId(undefined);
    setShowListModal(true);
  };

  const openAddSeriesToList = (seriesId: number) => {
    setModalSeriesId(seriesId);
    setShowListModal(true);
  };

  const handleModalDone = async () => {
    if (!user) return;
    try {
      const res = await getMyReadingLists();
      setMyLists(res);
    } catch (err) {
      console.error("Failed to refresh reading lists:", err);
      alert("Couldn't update your reading lists. Please try again.");
    }
  };

  const loadSeries = useCallback(
    async (pageToLoad: number) => {
      if (!seriesType || !hasMore) return;
      setLoading(true);

      controllerRef.current?.abort();
      controllerRef.current = new AbortController();

      try {
        const all = await fetchRankedSeriesPaginated(pageToLoad, PAGE_SIZE, {
          type: seriesType.toUpperCase(),
          genre: activeGenre ?? undefined,
          status: activeStatus ?? undefined,
          sort: sortBy,
          signal: controllerRef.current.signal,
        });

        setItems((prev) => {
          const existingIds = new Set(prev.map((item) => item.id));
          const unique = all.filter((item) => !existingIds.has(item.id));
          return [...prev, ...unique];
        });

        if (all.length < PAGE_SIZE) setHasMore(false);
      } catch (err: unknown) {
        if (!isRequestCanceled(err)) {
          console.error("Failed to fetch series:", err);
          alert("Failed to load series");
        }
      } finally {
        setLoading(false);
      }
    },
    [hasMore, seriesType, activeGenre, activeStatus, sortBy]
  );

  // Reset + load page 1 whenever the type, search term, or genre/status filters
  // change. Text search uses the search endpoint (then narrows to the page type
  // client-side); otherwise type + genre + status compose server-side.
  useEffect(() => {
    if (!seriesType) return;

    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    setItems([]);
    setPage(1);
    setHasMore(true);

    const run = async () => {
      setLoading(true);
      try {
        if (searchTerm.trim()) {
          // Pass the page's type so the backend scopes both results AND rank to
          // this category — each result keeps its true rank within the type,
          // instead of being re-ranked among the search matches.
          const all = await searchSeries(searchTerm.trim(), {
            type: seriesType.toUpperCase(),
          });
          setItems(all);
          setHasMore(false);
        } else {
          const all = await fetchRankedSeriesPaginated(1, PAGE_SIZE, {
            type: seriesType.toUpperCase(),
            genre: activeGenre ?? undefined,
            status: activeStatus ?? undefined,
            sort: sortBy,
            signal: controller.signal,
          });
          setItems(all);
          if (all.length < PAGE_SIZE) setHasMore(false);
        }
      } catch (err: unknown) {
        if (!isRequestCanceled(err)) {
          console.error("Failed to fetch series:", err);
          alert("Failed to load series");
        }
      } finally {
        setLoading(false);
      }
    };

    run();
    return () => controller.abort();
  }, [seriesType, searchTerm, activeGenre, activeStatus, sortBy]);

  useEffect(() => {
    if (!searchTerm.trim() && page > 1) loadSeries(page);
  }, [loadSeries, page, searchTerm]);

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this series?")) return;
    try {
      await deleteSeries(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      alert("Delete failed");
      console.error(err);
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-3 pb-8 pt-4 sm:px-6 sm:pb-10 sm:pt-6 lg:px-8">
      <Helmet>
        <title>{pageTitle}</title>
        <link rel="canonical" href={absoluteUrl(`/type/${typeLabel}`)} />
        <meta name="description" content={pageDescription} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:url" content={absoluteUrl(`/type/${typeLabel}`)} />
        <meta property="og:type" content="website" />
        <meta property="og:image" content={DEFAULT_SOCIAL_IMAGE} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
        <meta name="twitter:image" content={DEFAULT_SOCIAL_IMAGE} />
      </Helmet>
      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white/90 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.45)] dark-theme-shell">
        <RankingsToolbar
          contextLabel={seriesType?.toUpperCase() ?? "Rankings"}
          loadedCount={items.length}
          activeStatus={activeStatus}
          activeGenre={activeGenre}
          genres={allGenres}
          sort={sortBy}
          searchTerm={searchTerm}
          onSelectStatus={setActiveStatus}
          onSelectGenre={setActiveGenre}
          onSelectSort={setSortBy}
          rightSlot={
            canCreateMoreLists ? (
              <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
                <button
                  onClick={openCreateListOnly}
                  className="w-full rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-medium text-blue-800 shadow-sm transition hover:bg-blue-100 dark:border-[#475276] dark:bg-[linear-gradient(145deg,_rgba(34,47,83,0.82),_rgba(24,31,55,0.82))] dark:text-blue-200 dark:hover:bg-[linear-gradient(145deg,_rgba(43,58,101,0.86),_rgba(29,38,67,0.86))] sm:w-auto"
                >
                  + Create Reading List
                </button>
              </div>
            ) : null
          }
        />

        <div className="px-3.5 py-6 sm:px-6 sm:py-8">
          <CompareManager>
            {({ toggleCompare, isSelectedForCompare }) => (
              <InfiniteScroll
                dataLength={items.length}
                next={() => setPage((prev) => prev + 1)}
                hasMore={!searchTerm.trim() && hasMore}
                loader={
                  items.length > 0 ? (
                    <p className="py-6 text-center text-gray-500 dark:text-slate-400">Loading...</p>
                  ) : null
                }
                endMessage={
                  !loading && items.length > 0 ? (
                    <p className="py-6 text-center text-gray-400 dark:text-slate-500">
                      You've seen everything. New series are added periodically.
                    </p>
                  ) : null
                }
              >
                {items.length === 0 && loading ? <ShimmerLoader /> : null}

                {items.length === 0 && !loading ? (
                  <div className="py-12 text-center text-gray-600 dark:text-slate-300">
                    <p className="mb-3">
                      {activeGenre || activeStatus
                        ? `No ${
                            seriesType?.toUpperCase() ?? ""
                          } titles match these filters.`
                        : `No ${seriesType?.toUpperCase() ?? ""} titles found.`}
                    </p>
                    {activeGenre || activeStatus ? (
                      <button
                        onClick={() => {
                          setActiveGenre(null);
                          setActiveStatus(null);
                        }}
                        className="inline-flex items-center rounded-md bg-gray-200 px-4 py-2 text-gray-800 hover:bg-gray-300 dark:bg-[linear-gradient(145deg,_rgba(30,24,20,0.92),_rgba(22,18,15,0.92))] dark:text-slate-200 dark:hover:bg-[#241d19]"
                      >
                        Clear filters
                      </button>
                    ) : null}
                  </div>
                ) : null}

                {items.length > 0 ? (
                  <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 sm:gap-x-4 sm:gap-y-6 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
                    {items.map((item) => (
                      <ManCard
                        key={item.id}
                        id={item.id}
                        rank={item.rank ?? "-"}
                        title={item.title}
                        genre={item.genre}
                        votes={item.vote_count}
                        coverUrl={item.cover_url}
                        type={item.type}
                        author={item.author}
                        artist={item.artist}
                        avgScore={item.final_score}
                        onDelete={handleDelete}
                        isAdmin={isAdmin}
                        onEdit={() => setEditItem(item)}
                        onCompareToggle={() => toggleCompare(item)}
                        isCompared={isSelectedForCompare(item.id)}
                        onAddToReadingList={
                          user ? () => openAddSeriesToList(item.id) : undefined
                        }
                        isInReadingList={inAnyListIds.has(item.id)}
                        status={item.status}
                      />
                    ))}
                  </div>
                ) : null}
              </InfiniteScroll>
            )}
          </CompareManager>

          {editItem ? (
            <EditSeriesModal
              id={editItem.id}
              initialData={editItem}
              onClose={() => setEditItem(null)}
              onSuccess={() => {
                setItems([]);
                setPage(1);
                setHasMore(true);
                loadSeries(1);
              }}
            />
          ) : null}

          <ReadingListModal
            open={showListModal}
            onClose={() => setShowListModal(false)}
            seriesId={modalSeriesId}
            onDone={handleModalDone}
          />
        </div>
      </section>
    </div>
  );
};

export default FilteredSeriesPage;
