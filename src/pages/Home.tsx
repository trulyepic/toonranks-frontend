import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLoaderData } from "react-router-dom";
import ManCard from "../components/ManCard";
import AddSeriesModal from "../components/AddSeriesModal";
import EditSeriesModal from "../components/EditSeriesModal";
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
import InfiniteScroll from "react-infinite-scroll-component";
import { useSearch } from "../components/useSearch";
import ShimmerLoader from "../components/ShimmerLoader";
import CompareManager from "../components/CompareManager";
import { useUser } from "../login/useUser";
import ReadingListModal from "../components/ReadingListModal";
import RankingsToolbar, { type SortValue } from "../components/RankingsToolbar";
import { canSubmitSeriesUser, isAdminUser } from "../util/roleUtils";
import {
  absoluteUrl,
  DEFAULT_SOCIAL_IMAGE,
  OPERATOR_NAME,
  SITE_NAME,
  SITE_ORIGIN,
} from "../config/site";
// import { Link } from "react-router-dom";

const PAGE_SIZE = 25;

export function meta() {
  return [
    { title: `${SITE_NAME} | Top Manga, Manhwa, and Manhua` },
    {
      name: "description",
      content:
        "Browse the top-ranked Manga, Manhwa, and Manhua. Vote, review, and explore amazing series on Toon Ranks!",
    },
    {
      property: "og:title",
      content: `${SITE_NAME} | Top Manga, Manhwa, and Manhua`,
    },
    {
      property: "og:description",
      content: "Vote, review, and explore top-rated manga and webtoons!",
    },
    { property: "og:image", content: DEFAULT_SOCIAL_IMAGE },
    { property: "og:url", content: absoluteUrl("/") },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: SITE_NAME },
    {
      name: "twitter:description",
      content: "Discover and rate the best manga, manhwa, and manhua.",
    },
    { name: "twitter:image", content: DEFAULT_SOCIAL_IMAGE },
    {
      "script:ld+json": {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: SITE_NAME,
        url: SITE_ORIGIN,
        publisher: {
          "@type": "Organization",
          name: OPERATOR_NAME,
        },
        potentialAction: {
          "@type": "SearchAction",
          target: `${SITE_ORIGIN}/?search={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      },
    },
  ];
}

export function links() {
  return [{ rel: "canonical", href: absoluteUrl("/") }];
}

// SSR loader: fetch the first page of rankings on the server so the homepage's
// series cards are in the initial HTML. The client revalidates + paginates.
export async function loader() {
  const items = await fetchRankedSeriesPaginated(1, PAGE_SIZE, {
    sort: "score",
  }).catch(() => [] as RankedSeries[]);
  return { items };
}

const Home = () => {
  const initialItems =
    (useLoaderData() as { items?: RankedSeries[] } | null)?.items ?? [];
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<Series | null>(null);
  const [items, setItems] = useState<RankedSeries[]>(initialItems);
  // Skip the first client load when the server already seeded page 1 (default
  // filters), so we don't clear the SSR cards on hydration. Search/filter
  // changes still reset + refetch.
  const skipInitialLoad = useRef(initialItems.length > 0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [activeStatus, setActiveStatus] = useState<SeriesStatus>(null);
  const [activeGenre, setActiveGenre] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortValue>("score");
  // Cumulative set of genres seen this session, so the genre strip never
  // collapses when a genre/status filter narrows the loaded results.
  const [allGenres, setAllGenres] = useState<string[]>([]);
  // const [compareList, setCompareList] = useState<RankedSeries[]>([]);
  const [compareError, setCompareError] = useState<string | null>(null);

  const [showListModal, setShowListModal] = useState(false);
  const [modalSeriesId, setModalSeriesId] = useState<number | undefined>(
    undefined
  );
  const [myLists, setMyLists] = useState<ReadingList[] | null>(null); // null=unknown, []=none

  // const { searchTerm } = useSearch();
  const { searchTerm } = useSearch();
  const { user } = useUser();
  const isAdmin = isAdminUser(user);
  const canSubmitSeries = canSubmitSeriesUser(user);

  // Normalize a single genre label (e.g., "sci-fi" -> "Sci-Fi")
  const normalizeGenre = useCallback(
    (g: string) =>
      g
        .split(" ")
        .map((w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w))
        .join(" ")
        .replace(/\bSci-fi\b/gi, "Sci-Fi"),
    []
  );

  // Genres seen in the currently loaded items
  const derivedGenres = useMemo(() => {
    const set = new Set<string>();
    for (const it of items) {
      if (!it?.genre) continue;
      // support comma-separated genres like "Action, Thriller"
      const pieces = String(it.genre)
        .split(",")
        .map((s) => normalizeGenre(s.trim()))
        .filter(Boolean);
      pieces.forEach((p) => set.add(p));
    }
    return Array.from(set);
  }, [items, normalizeGenre]);

  // Accumulate genres across loads so the strip only grows (and stays usable
  // even when a genre filter narrows the result set to a single genre).
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

  // fetch lists once when user present
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
    (myLists ?? []).flatMap((l) => l.items?.map((it) => it.series_id) ?? [])
  );

  const openCreateListOnly = () => {
    setModalSeriesId(undefined); // create-only mode
    setShowListModal(true);
  };

  const openAddSeriesToList = (seriesId: number) => {
    setModalSeriesId(seriesId);
    setShowListModal(true);
  };

  const handleModalDone = async () => {
    // refresh lists (to reflect a newly created list or new item count)
    if (user) {
      try {
        const res = await getMyReadingLists();
        setMyLists(res);
      } catch (err) {
        console.error("Failed to refresh reading lists:", err);
        alert("Couldn't update your reading lists. Please try again.");
      }
    }
  };

  const loadSeries = useCallback(async () => {
    if (!hasMore) return;
    setLoading(true);

    try {
      const newItems = await fetchRankedSeriesPaginated(page, PAGE_SIZE, {
        genre: activeGenre ?? undefined,
        status: activeStatus ?? undefined,
        sort: sortBy,
      });
      setItems((prev) => {
        const newIds = new Set(prev.map((item) => item.id));
        const filtered = newItems.filter((item) => !newIds.has(item.id));
        return [...prev, ...filtered];
      });

      if (newItems.length < PAGE_SIZE) setHasMore(false);
    } catch (err) {
      console.error("Failed to fetch ranked series:", err);
    } finally {
      setLoading(false);
    }
  }, [hasMore, page, activeGenre, activeStatus, sortBy]);

  useEffect(() => {
    if (compareError) {
      const timer = setTimeout(() => setCompareError(null), 3000); // clear after 3s
      return () => clearTimeout(timer);
    }
  }, [compareError]);

  // const toggleCompare = (series: RankedSeries) => {
  //   setCompareList((prev) => {
  //     const exists = prev.find((item) => item.id === series.id);
  //     if (exists) {
  //       setCompareError(null); // Clear error on removal
  //       return prev.filter((item) => item.id !== series.id);
  //     }

  //     if (prev.length >= 4) {
  //       setCompareError("You can only compare up to 4 series.");
  //       return prev;
  //     }

  //     setCompareError(null); // Clear previous error
  //     return [...prev, series];
  //   });
  // };

  // const isSelectedForCompare = (id: number) => {
  //   return compareList.some((item) => item.id === id);
  // };

  // Reset and load page 1 whenever the search term or active filters change.
  // Text search (from the nav bar) and the genre+status filters are separate
  // modes: searching uses the search endpoint; otherwise genre + status compose
  // server-side on the rankings endpoint.
  useEffect(() => {
    if (skipInitialLoad.current) {
      skipInitialLoad.current = false;
      return;
    }
    const fetchData = async () => {
      if (searchTerm.trim()) {
        try {
          setLoading(true);
          const results = await searchSeries(searchTerm);
          setItems(results);
          setHasMore(false);
        } catch (err) {
          console.error("Search failed:", err);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(true);
        setItems([]);
        setPage(1);
        setHasMore(true);

        try {
          const results = await fetchRankedSeriesPaginated(1, PAGE_SIZE, {
            genre: activeGenre ?? undefined,
            status: activeStatus ?? undefined,
            sort: sortBy,
          });
          setItems(results);
          if (results.length < PAGE_SIZE) setHasMore(false);
        } catch (err) {
          console.error("Failed to fetch default ranked series:", err);
        } finally {
          setLoading(false);
        }
      }
    };

    fetchData();
  }, [searchTerm, activeGenre, activeStatus, sortBy]);

  useEffect(() => {
    if (!searchTerm) loadSeries();
  }, [loadSeries, page, searchTerm]);

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this series?")) return;

    try {
      await deleteSeries(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      alert("Failed to delete.");
      console.error(err);
    }
  };
  // console.log("Items:", items);
  return (
    <>

      <div className="mx-auto w-full max-w-7xl px-3 pb-8 pt-4 sm:px-6 sm:pb-10 sm:pt-6 lg:px-8">
        <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white/90 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.45)] dark-theme-shell">
          <RankingsToolbar
            contextLabel="Rankings"
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
              canSubmitSeries || canCreateMoreLists ? (
                <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
                  {canCreateMoreLists && (
                    <button
                      onClick={openCreateListOnly}
                      className="w-full rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-medium text-blue-800 shadow-sm transition hover:bg-blue-100 dark:border-[#475276] dark:bg-[linear-gradient(145deg,_rgba(34,47,83,0.82),_rgba(24,31,55,0.82))] dark:text-blue-200 dark:hover:bg-[linear-gradient(145deg,_rgba(43,58,101,0.86),_rgba(29,38,67,0.86))] sm:w-auto"
                    >
                      + Create Reading List
                    </button>
                  )}
                  {canSubmitSeries && (
                    <button
                      onClick={() => setShowModal(true)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50 dark-theme-card-soft dark:text-slate-100 dark:hover:bg-[#241d19] sm:w-auto"
                    >
                      + Add Title
                    </button>
                  )}
                </div>
              ) : null
            }
          />

          <div className="px-3.5 py-6 sm:px-6 sm:py-8">
          {/* {isAdmin && (
            <div className="flex justify-end mb-4">
              <button
                onClick={() => setShowModal(true)}
                className="px-5 py-2.5 rounded-md font-medium text-gray-800 bg-white/70 backdrop-blur-sm border border-gray-300 shadow-md hover:bg-white hover:shadow-lg hover:text-black transition-all duration-200"
              >
                + Add Series
              </button>
            </div>
          )}

          {canCreateMoreLists && (
            <button
              onClick={openCreateListOnly}
              className="px-5 py-2.5 rounded-md font-medium text-blue-800 bg-blue-100 border border-blue-300 shadow hover:bg-blue-200 transition-all duration-200"
            >
              + Create Reading List
            </button>
          )} */}

          <CompareManager>
            {({ toggleCompare, isSelectedForCompare }) => (
              <InfiniteScroll
                dataLength={items.length}
                next={() => setPage((prev) => prev + 1)}
                hasMore={!searchTerm && hasMore}
                loader={
                  items.length > 0 ? (
                    <div className="flex justify-center py-6">
                      <div className="w-6 h-6 border-4 border-blue-400 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : null
                }
                endMessage={
                  <p className="text-center py-6 text-gray-400 dark:text-slate-500">
                    🎉 You’ve seen everything, new series added priodically.
                  </p>
                }
              >
                {items.length === 0 && loading ? (
                  <ShimmerLoader />
                ) : (
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
                )}
              </InfiniteScroll>
            )}
          </CompareManager>
          {/* {compareError && (
            <div className="fixed top-6 left-1/2 transform -translate-x-1/2 rounded bg-red-100 px-4 py-2 text-red-700 shadow-lg z-50 dark:bg-rose-950/70 dark:text-rose-300">
              {compareError}
            </div>
          )} */}

          {showModal && <AddSeriesModal onClose={() => setShowModal(false)} />}
          {editItem && (
            <EditSeriesModal
              id={editItem.id}
              initialData={editItem}
              onClose={() => setEditItem(null)}
              onSuccess={() => {
                setItems([]);
                setPage(1);
                setHasMore(true);
                loadSeries(); // Refresh after edit
              }}
            />
          )}

            <ReadingListModal
              open={showListModal}
              onClose={() => setShowListModal(false)}
              seriesId={modalSeriesId}
              onDone={handleModalDone}
            />
          </div>
        </section>
        {/* {compareList.length >= 2 && (
          <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
            <Link
              to="/compare"
              state={{ items: compareList }}
              className="bg-blue-600 text-white px-6 py-3 rounded-full shadow-lg hover:bg-blue-700 transition"
            >
              Compare {compareList.length} Series
            </Link>
          </div>
        )} */}
      </div>
    </>
  );
};

export default Home;
